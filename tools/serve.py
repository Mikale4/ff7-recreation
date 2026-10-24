"""The game's local server: serves the project like `python -m http.server`, and keeps every save on disk.

    python tools/serve.py [port]        (port 8777 by default; .claude/launch.json "ff7" runs this)

The game keeps its saves in the browser's storage (localStorage). A browser can lose that storage: a private window,
cleared site data, or a browser pane whose storage lives only in memory (the Claude app's preview pane lost every save
when the app restarted, 2026-10-04). So js/core/diskstore.js copies every save write here, and this server keeps them
as files in saves/ next to the game:

    GET    /__saves          every save, as JSON { key: value }   (the game restores any its browser lacks, at boot)
    PUT    /__save?k=KEY     store one save (the request body is the value)
    DELETE /__save?k=KEY     remove one (moved into the backups first, never just deleted)

saves/<KEY>.json holds the current value of each key. Before a save is overwritten or removed, its old copy goes to
saves/backups/<KEY>/<time>.json (at most one every 10 minutes per key; the newest 40 kept), so a bad save can be undone
by copying a backup back over the current file while the server is stopped.
"""
import http.server
import json
import os
import re
import shutil
import sys
import threading
import time
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAVES = os.path.join(ROOT, 'saves')
BACKUPS = os.path.join(SAVES, 'backups')
KEY_OK = re.compile(r'^ff7[A-Za-z0-9_.\-]{1,120}$')
BACKUP_EVERY = 600      # seconds between backups of one key
BACKUP_KEEP = 40
LOCK = threading.Lock()


def path_of(key):
    return os.path.join(SAVES, key + '.json')


def backup(key):
    """Copy the current file of a key into its backups (if the last backup is old enough), keeping the newest few."""
    src = path_of(key)
    if not os.path.exists(src):
        return
    d = os.path.join(BACKUPS, key)
    os.makedirs(d, exist_ok=True)
    olds = sorted(f for f in os.listdir(d) if f.endswith('.json'))
    if olds and time.time() - os.path.getmtime(os.path.join(d, olds[-1])) < BACKUP_EVERY:
        return
    shutil.copy2(src, os.path.join(d, time.strftime('%Y%m%d-%H%M%S') + '.json'))
    for f in olds[:max(0, len(olds) + 1 - BACKUP_KEEP)]:
        try:
            os.remove(os.path.join(d, f))
        except OSError:
            pass


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, fmt, *args):   # (quiet for the game's files; the saves are logged)
        if '/__save' in self.path:
            super().log_message(fmt, *args)

    def end_headers(self):
        if self.path.startswith('/__save'):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def reply(self, code, obj):
        body = json.dumps(obj).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def key(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        k = (q.get('k') or [''])[0]
        return k if KEY_OK.match(k) else None

    def do_GET(self):
        if urllib.parse.urlparse(self.path).path == '/__saves':
            out = {}
            with LOCK:
                if os.path.isdir(SAVES):
                    for f in os.listdir(SAVES):
                        if f.endswith('.json') and KEY_OK.match(f[:-5]):
                            with open(os.path.join(SAVES, f), encoding='utf-8') as fh:
                                out[f[:-5]] = fh.read()
            return self.reply(200, out)
        return super().do_GET()

    def do_PUT(self):
        if urllib.parse.urlparse(self.path).path != '/__save':
            return self.reply(404, {'ok': False})
        k = self.key()
        if not k:
            return self.reply(400, {'ok': False, 'error': 'bad key'})
        n = int(self.headers.get('Content-Length') or 0)
        value = self.rfile.read(n).decode('utf-8')
        with LOCK:
            os.makedirs(SAVES, exist_ok=True)
            p = path_of(k)
            if os.path.exists(p):
                with open(p, encoding='utf-8') as fh:
                    if fh.read() == value:
                        return self.reply(200, {'ok': True, 'same': True})
                backup(k)
            tmp = p + '.tmp'
            with open(tmp, 'w', encoding='utf-8') as fh:
                fh.write(value)
            os.replace(tmp, p)   # (whole or not at all: a crash mid-write never leaves half a save)
        return self.reply(200, {'ok': True})

    def do_DELETE(self):
        if urllib.parse.urlparse(self.path).path != '/__save':
            return self.reply(404, {'ok': False})
        k = self.key()
        if not k:
            return self.reply(400, {'ok': False, 'error': 'bad key'})
        with LOCK:
            p = path_of(k)
            if os.path.exists(p):
                d = os.path.join(BACKUPS, k)
                os.makedirs(d, exist_ok=True)
                shutil.move(p, os.path.join(d, time.strftime('%Y%m%d-%H%M%S') + '-removed.json'))
        return self.reply(200, {'ok': True})


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8777
    os.makedirs(SAVES, exist_ok=True)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler)
    print(f'Serving {ROOT} on http://127.0.0.1:{port}/ (saves in {SAVES})', flush=True)
    srv.serve_forever()


if __name__ == '__main__':
    main()
