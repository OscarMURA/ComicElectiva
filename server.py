#!/usr/bin/env python3
"""Servidor local para ComicElectiva.

- Sirve estáticos como `python3 -m http.server`.
- POST /api/upload {dataUrl, filename?}  -> guarda en assets/uploads/<hash>.<ext>
                                            y devuelve {url, contentType, bytes}.
- GET  /api/state                        -> devuelve data/state.json (o snapshot vacío).
- POST /api/state {snapshot}             -> escribe data/state.json (atómico).

Todo lo subido y el estado quedan dentro del repo para compartir vía git.
"""

import base64
import hashlib
import json
import mimetypes
import os
import re
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn

ROOT = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(ROOT, 'assets', 'uploads')
STATE_DIR = os.path.join(ROOT, 'data')
STATE_PATH = os.path.join(STATE_DIR, 'state.json')

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(STATE_DIR, exist_ok=True)

DATAURL_RE = re.compile(r'^data:([^;]+);base64,(.+)$', re.DOTALL)
MAX_UPLOAD = 200 * 1024 * 1024   # 200 MB
MAX_STATE = 50 * 1024 * 1024     # 50 MB

EXT_FALLBACK = {
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
    'video/x-msvideo': 'avi', 'video/ogg': 'ogv',
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
    'image/webp': 'webp', 'image/svg+xml': 'svg',
    'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/ogg': 'ogg',
    'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/aac': 'aac',
}


def safe_ext(content_type):
    if not content_type:
        return 'bin'
    ext = EXT_FALLBACK.get(content_type)
    if ext:
        return ext
    guess = mimetypes.guess_extension(content_type) or ''
    return guess.lstrip('.') or 'bin'


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Asegura que el navegador NO cachee respuestas dinámicas ni JS/CSS
        # mientras desarrollamos (evita ver código viejo).
        path = (self.path or '').split('?', 1)[0]
        if path.startswith('/api/') or path.endswith(('.js', '.css', '.html', '/')):
            self.send_header('Cache-Control', 'no-store, must-revalidate')
        SimpleHTTPRequestHandler.end_headers(self)

    # ---- helpers ----------------------------------------------------------
    def _send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self, max_bytes):
        length = int(self.headers.get('Content-Length') or 0)
        if length <= 0:
            return b''
        if length > max_bytes:
            raise ValueError(f'payload demasiado grande ({length} > {max_bytes})')
        return self.rfile.read(length)

    # ---- routes -----------------------------------------------------------
    def do_GET(self):
        if self.path == '/api/state':
            try:
                with open(STATE_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            except FileNotFoundError:
                data = {'app': 'HilosDelAgua', 'version': 1, 'data': {}}
            except Exception as e:
                return self._send_json(500, {'error': str(e)})
            return self._send_json(200, data)
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        if self.path == '/api/upload':
            return self._do_upload()
        if self.path == '/api/state':
            return self._do_save_state()
        self.send_error(404, 'unknown endpoint')

    def _do_upload(self):
        try:
            raw = self._read_body(MAX_UPLOAD + 4096)
            body = json.loads(raw.decode('utf-8'))
        except Exception as e:
            return self._send_json(400, {'error': f'json inválido: {e}'})
        data_url = body.get('dataUrl') or ''
        m = DATAURL_RE.match(data_url)
        if not m:
            return self._send_json(400, {'error': 'dataUrl requerido (formato data:<type>;base64,...)'})
        content_type, b64 = m.group(1), m.group(2)
        try:
            data = base64.b64decode(b64, validate=False)
        except Exception as e:
            return self._send_json(400, {'error': f'base64 inválido: {e}'})
        if len(data) > MAX_UPLOAD:
            return self._send_json(413, {'error': 'archivo demasiado grande'})
        digest = hashlib.sha1(data).hexdigest()[:16]
        ext = safe_ext(content_type)
        filename = f'{digest}.{ext}'
        target = os.path.join(UPLOADS_DIR, filename)
        if not os.path.exists(target):
            tmp = target + '.tmp'
            with open(tmp, 'wb') as f:
                f.write(data)
            os.replace(tmp, target)
        return self._send_json(200, {
            'url': f'assets/uploads/{filename}',
            'contentType': content_type,
            'bytes': len(data),
        })

    def _do_save_state(self):
        try:
            raw = self._read_body(MAX_STATE + 4096)
            body = json.loads(raw.decode('utf-8'))
        except Exception as e:
            return self._send_json(400, {'error': f'json inválido: {e}'})
        if not isinstance(body, dict):
            return self._send_json(400, {'error': 'snapshot debe ser objeto'})
        tmp = STATE_PATH + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            json.dump(body, f, ensure_ascii=False, indent=2)
        os.replace(tmp, STATE_PATH)
        return self._send_json(200, {'ok': True, 'savedAt': body.get('savedAt')})

    def log_message(self, fmt, *args):
        # Silencia los GET estáticos; solo loguea API y errores.
        if self.path.startswith('/api/') or (args and str(args[1]).startswith(('4', '5'))):
            sys.stderr.write('[%s] %s\n' % (self.log_date_time_string(), fmt % args))


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == '__main__':
    port = int(os.environ.get('PORT', '8000'))
    bind = os.environ.get('BIND', '0.0.0.0')
    os.chdir(ROOT)
    httpd = ThreadingHTTPServer((bind, port), Handler)
    print(f'ComicElectiva server: http://{bind}:{port}  (root={ROOT})', flush=True)
    print(f'  uploads -> {UPLOADS_DIR}', flush=True)
    print(f'  state   -> {STATE_PATH}', flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nbye')
