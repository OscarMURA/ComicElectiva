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
import datetime
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
STATE_PATH = os.path.join(STATE_DIR, 'state.json')   # legacy / fallback
SCENES_DIR = os.path.join(STATE_DIR, 'scenes')

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(STATE_DIR, exist_ok=True)
os.makedirs(SCENES_DIR, exist_ok=True)

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


# ============================================================
# State per-scene split/merge
# ------------------------------------------------------------
# El cliente sigue trabajando con un snapshot único (state.json era el bote
# central). Para evitar conflictos de git cuando varios compañeros editan
# escenas distintas, el servidor divide ese snapshot en data/scenes/*.json:
#   - data/scenes/sceneN.json  → datos de la escena/capítulo N
#   - data/scenes/global.json  → galería, música global, volumen
# En GET /api/state los archivos se vuelven a unir y se devuelven como antes.
# state.json queda solo como fallback de lectura inicial (migración).
# ============================================================

# Cualquier id en localStorage que pertenezca a un capítulo arranca con
# `<prefijo letras><número>-...`. Cubre `e1-...` (actual) y `c1-...` (legacy).
ID_CHAPTER_RE = re.compile(r'^[a-z]+(\d+)-', re.IGNORECASE)

GLOBAL_KEYS = {
    'comic-user-character-gallery',
    'comic-user-global-audio',
    'comic-global-audio-volume',
}
PANEL_OBJECT_KEYS = {
    'comic-user-bubbles',
    'comic-user-backgrounds',
    'comic-user-panel-audio',
}
BUBBLE_OR_CHAR_OBJECT_KEYS = {
    'comic-bubble-positions',
    'comic-bubble-fontsizes',
    'comic-bubble-text-overrides',
    'comic-bubble-timing',
    'comic-bubble-audio',
    'comic-bubble-sizes',
    'comic-character-positions',
    'comic-character-sizes',
}
ID_ARRAY_KEYS = {
    'comic-deleted-panels',
    'comic-deleted-bubbles',
    'comic-panel-order',
}
CHARACTER_ARRAY_KEY = 'comic-user-characters'
EXTRA_PANELS_KEY = 'comic-extra-panels'


def chapter_from_id(s):
    if not s:
        return None
    m = ID_CHAPTER_RE.match(str(s))
    return m.group(1) if m else None


def split_data_by_scene(data):
    """Divide el dict raíz del snapshot en buckets por escena.

    Devuelve {scene_id|'global': {key: value, ...}}. Los IDs sin capítulo
    detectable caen en 'global' (mejor que perder información).
    """
    buckets = {}

    def bucket(scene_id):
        return buckets.setdefault(scene_id, {})

    for key, value in (data or {}).items():
        if key in GLOBAL_KEYS:
            bucket('global')[key] = value
            continue
        if key in PANEL_OBJECT_KEYS and isinstance(value, dict):
            for pid, v in value.items():
                ch = chapter_from_id(pid)
                if ch is None:
                    continue
                bucket(ch).setdefault(key, {})[pid] = v
            continue
        if key in BUBBLE_OR_CHAR_OBJECT_KEYS and isinstance(value, dict):
            for sub_id, v in value.items():
                ch = chapter_from_id(sub_id)
                if ch is None:
                    continue
                bucket(ch).setdefault(key, {})[sub_id] = v
            continue
        if key == CHARACTER_ARRAY_KEY and isinstance(value, list):
            for item in value:
                if not isinstance(item, dict):
                    continue
                ch = chapter_from_id(item.get('panelId') or item.get('id'))
                if ch is None:
                    continue
                bucket(ch).setdefault(key, []).append(item)
            continue
        if key in ID_ARRAY_KEYS and isinstance(value, list):
            for v in value:
                ch = chapter_from_id(v)
                if ch is None:
                    continue
                bucket(ch).setdefault(key, []).append(v)
            continue
        if key == EXTRA_PANELS_KEY and isinstance(value, dict):
            for chid, panels_list in value.items():
                ch = str(chid)
                bucket(ch).setdefault(key, {})[ch] = panels_list
            continue
        # Clave desconocida o de formato inesperado → no perderla.
        bucket('global')[key] = value

    return buckets


def merge_scene_buckets(buckets_by_scene):
    """Recombina los buckets en un único dict de datos como esperaba el cliente."""
    merged = {}
    for scene_id, sd in buckets_by_scene.items():
        for key, value in sd.items():
            if isinstance(value, dict):
                merged.setdefault(key, {}).update(value)
            elif isinstance(value, list):
                lst = merged.setdefault(key, [])
                for item in value:
                    # Para arrays de ids evitamos duplicados; para listas de
                    # objetos (characters) confiamos en que los ids ya son
                    # únicos pero dedup por id si está disponible.
                    if isinstance(item, dict):
                        if 'id' in item and any(
                            isinstance(x, dict) and x.get('id') == item.get('id')
                            for x in lst
                        ):
                            continue
                        lst.append(item)
                    else:
                        if item not in lst:
                            lst.append(item)
            else:
                merged[key] = value
    return merged


def _scene_filename(scene_id):
    return 'global.json' if scene_id == 'global' else f'scene{scene_id}.json'


def _scene_id_from_filename(name):
    if name == 'global.json':
        return 'global'
    m = re.match(r'^scene(.+)\.json$', name)
    return m.group(1) if m else None


def read_scenes():
    """Lee data/scenes/*.json y devuelve {scene_id: data_dict}. Vacío si no hay."""
    out = {}
    if not os.path.isdir(SCENES_DIR):
        return out
    for name in sorted(os.listdir(SCENES_DIR)):
        if not name.endswith('.json'):
            continue
        scene_id = _scene_id_from_filename(name)
        if scene_id is None:
            continue
        path = os.path.join(SCENES_DIR, name)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                obj = json.load(f)
            data = obj.get('data') if isinstance(obj, dict) else None
            if isinstance(data, dict):
                out[scene_id] = data
        except Exception as e:
            print(f'[ComicElectiva] no se pudo leer {name}: {e}', file=sys.stderr)
    return out


def write_scenes(buckets, saved_at=None):
    """Escribe (atómico) cada bucket. Solo toca disco si el contenido cambió.

    Devuelve lista de scene_ids realmente escritos. Las escenas que existen
    en disco pero no en `buckets` quedan vacías (se reemplaza con dict
    vacío para mantener el archivo, sin borrarlo).
    """
    os.makedirs(SCENES_DIR, exist_ok=True)
    saved_at = saved_at or (datetime.datetime.utcnow().isoformat() + 'Z')

    # Garantizar que las escenas previamente existentes pero ahora vacías
    # se actualicen con data={} (para que el git diff refleje el vaciado).
    existing = set()
    if os.path.isdir(SCENES_DIR):
        for n in os.listdir(SCENES_DIR):
            sid = _scene_id_from_filename(n)
            if sid is not None:
                existing.add(sid)

    all_ids = set(buckets.keys()) | existing
    written = []
    for scene_id in sorted(all_ids):
        data = buckets.get(scene_id, {})
        path = os.path.join(SCENES_DIR, _scene_filename(scene_id))
        new_obj = {
            'app': 'HilosDelAgua',
            'version': 1,
            'scene': scene_id,
            'savedAt': saved_at,
            'data': data,
        }
        new_body = json.dumps(new_obj, ensure_ascii=False, indent=2, sort_keys=True)
        # Saltar escritura si el archivo existe y solo cambia 'savedAt'.
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    old_obj = json.load(f)
                if isinstance(old_obj, dict):
                    old_cmp = dict(old_obj); old_cmp.pop('savedAt', None)
                    new_cmp = dict(new_obj); new_cmp.pop('savedAt', None)
                    if old_cmp == new_cmp:
                        continue
            except Exception:
                pass
        tmp = path + '.tmp'
        with open(tmp, 'w', encoding='utf-8') as f:
            f.write(new_body)
        os.replace(tmp, path)
        written.append(scene_id)
    return written


def load_state_snapshot():
    """Devuelve el snapshot agregado para GET /api/state.

    Prefiere data/scenes/*.json. Si no existen (instalación nueva o tras
    pull antes de la primera escritura), cae a data/state.json. Si tampoco
    está, devuelve un snapshot vacío.
    """
    scenes = read_scenes()
    if scenes:
        data = merge_scene_buckets(scenes)
        return {'app': 'HilosDelAgua', 'version': 1, 'data': data}
    # Fallback legacy.
    try:
        with open(STATE_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return {'app': 'HilosDelAgua', 'version': 1, 'data': {}}


def save_state_snapshot(snapshot):
    """Divide y persiste el snapshot entrante como data/scenes/*.json."""
    data = snapshot.get('data') if isinstance(snapshot, dict) else None
    if not isinstance(data, dict):
        data = snapshot if isinstance(snapshot, dict) else {}
    buckets = split_data_by_scene(data)
    saved_at = snapshot.get('savedAt') if isinstance(snapshot, dict) else None
    return write_scenes(buckets, saved_at=saved_at)


def migrate_state_if_needed():
    """Si existe data/state.json y data/scenes está vacío, parte el state.json
    en escenas para que los colaboradores no tengan que volver a editar.

    Idempotente: si scenes ya tiene contenido, no hace nada.
    """
    try:
        if read_scenes():
            return
        if not os.path.exists(STATE_PATH):
            return
        with open(STATE_PATH, 'r', encoding='utf-8') as f:
            snap = json.load(f)
        written = save_state_snapshot(snap)
        if written:
            print(
                f'[ComicElectiva] migración: state.json → {len(written)} archivos '
                f'en data/scenes/ ({", ".join(written)})',
                file=sys.stderr,
            )
    except Exception as e:
        print(f'[ComicElectiva] migración falló: {e}', file=sys.stderr)


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
                data = load_state_snapshot()
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
        try:
            written = save_state_snapshot(body)
        except Exception as e:
            return self._send_json(500, {'error': f'no se pudo guardar escenas: {e}'})
        return self._send_json(200, {
            'ok': True,
            'savedAt': body.get('savedAt'),
            'scenesWritten': written,
        })

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
    migrate_state_if_needed()
    httpd = ThreadingHTTPServer((bind, port), Handler)
    print(f'ComicElectiva server: http://{bind}:{port}  (root={ROOT})', flush=True)
    print(f'  uploads -> {UPLOADS_DIR}', flush=True)
    print(f'  scenes  -> {SCENES_DIR}', flush=True)
    print(f'  state.json (legacy) -> {STATE_PATH}', flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nbye')
