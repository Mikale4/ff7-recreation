"""Dev tool: serves the game like `python -m http.server`, and receives the menu portraits rendered in the page
(tools/render_portraits.js), writing them to assets/portraits/<name>.png. Localhost only; names are restricted to
[a-z0-9_] and PNG data only.

    python tools/portrait_sink.py [8778]     (.claude/launch.json "portrait-sink"), then open http://localhost:8778/

The page POSTs the PNG bytes to /save?name=<id> (the same origin: a browser pane may block other ports).
"""
import os, re, sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'portraits')
PNG = b'\x89PNG\r\n\x1a\n'


class Sink(SimpleHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:8777')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_POST(self):
        if urlparse(self.path).path != '/save':
            self.send_response(404); self.end_headers(); return
        q = parse_qs(urlparse(self.path).query)
        name = (q.get('name') or [''])[0]
        data = self.rfile.read(int(self.headers.get('Content-Length') or 0))
        if not re.fullmatch(r'[a-z0-9_]{1,40}', name) or not data.startswith(PNG) or len(data) > 2_000_000:
            self.send_response(400); self._cors(); self.end_headers(); self.wfile.write(b'bad request'); return
        path = os.path.join(OUT, name + '.png')
        with open(path, 'wb') as f:
            f.write(data)
        self.send_response(200); self._cors(); self.end_headers(); self.wfile.write(('saved ' + name).encode())
        print('saved', path, len(data), 'bytes', flush=True)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8778
    print('portrait sink on 127.0.0.1:%d -> %s' % (port, OUT), flush=True)
    ThreadingHTTPServer(("127.0.0.1", port), partial(Sink, directory=ROOT)).serve_forever()   # (threads: a browser's idle preconnect would block a single-threaded server)
