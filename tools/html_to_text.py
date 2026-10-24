# Convert the GameFAQs HTML guides in references/gameplay and game mechanics/ into plain text
# (references/text/*.txt) so they can be grepped while authoring data.
import os, re, html, sys
SRC = os.path.join(os.path.dirname(__file__), '..', 'references', 'gameplay and game mechanics')
DST = os.path.join(os.path.dirname(__file__), '..', 'references', 'text')
os.makedirs(DST, exist_ok=True)
for name in sorted(os.listdir(SRC)):
    if not name.lower().endswith('.html'):
        continue
    raw = open(os.path.join(SRC, name), encoding='utf-8', errors='replace').read()
    # GameFAQs puts the FAQ body in <pre> blocks (text FAQs) or in div.faqtext / #faqwrap (html FAQs)
    pres = re.findall(r'<pre[^>]*>(.*?)</pre>', raw, flags=re.S | re.I)
    if pres and sum(len(p) for p in pres) > 5000:
        body = '\n'.join(pres)
    else:
        m = re.search(r'<div[^>]+id="faqwrap"[^>]*>(.*)', raw, flags=re.S | re.I)
        body = m.group(1) if m else raw
        body = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', body, flags=re.S | re.I)
        body = re.sub(r'<br\s*/?>', '\n', body, flags=re.I)
        body = re.sub(r'</(p|div|h\d|li|tr|table)>', '\n', body, flags=re.I)
        body = re.sub(r'</t[dh]>', '\t', body, flags=re.I)
    body = re.sub(r'<[^>]+>', '', body)
    body = html.unescape(body)
    body = re.sub(r'\n{4,}', '\n\n\n', body)
    short = re.sub(r'^Final Fantasy VII -? ?', '', name[:-5])
    short = re.sub(r' - PlayStation - By .*', '', short)
    short = re.sub(r' for PlayStation by .*', '', short)
    short = re.sub(r'[^A-Za-z0-9]+', '_', short).strip('_')
    out = os.path.join(DST, short + '.txt')
    open(out, 'w', encoding='utf-8').write(body)
    print(f'{len(body):>9}  {short}.txt')
