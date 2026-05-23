# Los Hilos del Agua y el Plato de las Preguntas

> Un cuento ilustrado interactivo sobre el agua, la comida y la mirada
> sensorial de un niño y su perro que recorren un día completo en el
> Valle del Cauca.

**Bongo**, un narrador sensorial, acompaña al lector a través de **9 escenas
en 3 actos** mientras descubre cómo el agua se desperdicia en el patio, cómo
la comida se tira en una galería del mercado, cómo una niña ve el reflejo de
todo en un charco, y cómo el río Cauca termina llorando al atardecer. La
historia cierra con una sopa familiar hecha de preguntas y una pequeña
revolución cotidiana.

El cuento se lee **desplazándose hacia abajo**: cada panel aparece a pantalla
completa, con narración, diálogos tipo cómic, sonidos suaves y luciérnagas
doradas flotando en el fondo.

---

## Cómo abrirlo

### Opción 1 · Servidor local (recomendada — habilita edición + uploads)

Desde la carpeta del proyecto:

```bash
python3 server.py
```

Y abre `http://localhost:8000`. El servidor incluido (`server.py`) además
de servir estáticos expone dos endpoints internos:

- `POST /api/upload` — recibe imágenes/audio/video como dataURL y los
  guarda en `assets/uploads/<sha1>.<ext>`.
- `GET  /api/state`  — devuelve el estado del editor agregado desde
  `js/data/scenes/*.json` (con fallback a `js/data/state.json` legacy).
- `POST /api/state`  — recibe el snapshot, lo divide por escena y lo
  escribe en `js/data/scenes/sceneN.json` (atómico, solo si cambia).

Si quieres exponerlo en la red local usa `BIND=0.0.0.0 python3 server.py`
(es el default) y conéctate desde otro dispositivo a `http://<tu-IP>:8000`.

### Opción 2 · Doble clic (solo lectura)

Abre `index.html` en el navegador. Las ediciones quedarán en `localStorage`
del navegador y no se sincronizarán con el repo.

> Algunos navegadores bloquean `fetch('./js/data/story.json')` con `file://`
> por seguridad. Si ves la pantalla en blanco, usa la opción 1.

---

## Estructura del proyecto

```
ComicElectiva/
├── index.html
├── README.md
├── server.py                      # Servidor local + uploads + estado
│
├── css/
│   ├── main.css
│   ├── panels.css
│   ├── responsive.css
│   └── animations.css
│
├── js/
│   ├── main.js                    # Arranque general
│   ├── scrollManager.js           # Detección del panel visible (IntersectionObserver)
│   ├── panelLoader.js             # Construye el DOM + tinte de fondo por imagen
│   ├── typewriter.js              # Animación máquina de escribir + sync con audio
│   ├── audioManager.js            # Global / ambient / sfx / por burbuja
│   ├── immersion.js               # Luciérnagas doradas detrás de los paneles
│   ├── bubbleEditor.js            # Editor: paneles, burbujas, personajes, undo/redo
│   ├── storyState.js              # Lista canónica de claves de localStorage
│   ├── repoSync.js                # Sincroniza localStorage ⇄ servidor
│   ├── chapters/
│   │   ├── chapter1.js            # Capítulo 1: La serpiente que tose
│   │   ├── chapter2.js            # Capítulo 2: Dentro de la gota
│   │   ├── … (hasta chapter9.js)
│   └── data/
│       ├── story.json             # Metadatos globales (paleta, fonts, personajes, índice)
│       ├── state.json             # Caché local del estado (gitignored)
│       └── scenes/
│           ├── scene1.json        # Ediciones de la escena 1
│           ├── … sceneN.json
│           └── global.json        # Galería + música compartida
│
└── assets/
    ├── fonts/
    ├── images/
    │   ├── panels/                # Ilustraciones por panel
    │   ├── characters/            # Personajes recortados
    │   └── backgrounds/
    ├── uploads/                   # Archivos subidos desde el editor (nombrados por hash)
    └── sounds/
        ├── ambient/               # Música global + ambient por capítulo
        ├── effects/               # Efectos puntuales
        └── narration/             # Voz narrada opcional por panel
```

---

## La historia

Estructurada en **3 actos**, **9 escenas**, **3 paneles cada una**:

| #   | Acto                       | Título                                | Locación                       |
| --- | -------------------------- | ------------------------------------- | ------------------------------ |
| 1   | Acto I · Planteamiento     | La serpiente que tose                 | Patio · 7:00 AM                |
| 2   | Acto I · Planteamiento     | Dentro de la gota                     | Túnel onírico                  |
| 3   | Acto II · Confrontación    | El campo partido en dos               | Valle del Cauca · Mediodía     |
| 4   | Acto II · Confrontación    | El callejón de la comida tirada       | Galería Alameda · 1:00 PM      |
| 5   | Acto II · Confrontación    | La niña del charco                    | Parque · 4:00 PM               |
| 6   | Acto II · Confrontación    | El río que llora *(clímax)*           | Río Cauca · Atardecer          |
| 7   | Acto III · Resolución      | La sopa de preguntas                  | Cocina · 7:00 PM               |
| 8   | Acto III · Resolución      | La pequeña revolución                 | Día siguiente · Tríptico       |
| 9   | Acto III · Resolución      | El mapa de Bongo *(epílogo)*          | Habitación · Noche             |

Personajes principales (`js/data/story.json`):

- **Bongo** — narrador sensorial. Acompaña al lector percibiendo el mundo
  desde lo que ve, escucha, huele y siente.
- **Narrador** — voz narrativa de fondo.
- **Niña del charco** — aparece en la Escena 5. Curiosa, mira el reflejo en
  el agua del parque.

---

## Modo edición

Para arrastrar burbujas, mover personajes, cambiar textos, subir audio o
agregar nuevos paneles, hay un **modo edición** protegido por contraseña.

1. Clic en el botón flotante con el lápiz (✏️) en la esquina inferior izquierda.
2. Contraseña: **`oscar22lulu`**.
3. La sesión queda autenticada hasta cerrar la pestaña o hacer logout desde el panel.

### Qué se puede hacer

- **Burbujas**: agregar, editar texto, mover, redimensionar, cambiar tipo
  (diálogo, pensamiento, grito, susurro, narración), pegar audio por burbuja,
  ajustar ritmo (orden + delay), undo/redo (`Ctrl+Z` / `Ctrl+Y`).
- **Personajes**: subir imagen, GIF o video; ubicarlos en cualquier panel;
  guardarlos en la galería para reutilizarlos.
- **Fondos**: subir una imagen y el panel se tiñe automáticamente con el
  color promedio de la imagen (fondos integrados, sin bordes duros).
- **Paneles**: **agregar paneles nuevos** a una escena existente (`➕ Agregar
  panel a esta escena`), reordenar con drag & drop, eliminar.
- **Audio**: subir música global, ambient por panel, audio por burbuja.
- **Exportar / importar** el estado completo en un solo `.json` para
  respaldo o portar entre navegadores.

### Cambiar la contraseña

Edita la constante `EDIT_PASSWORD` al inicio de `js/bubbleEditor.js` y recarga.

---

## Persistencia y colaboración

Cuando ejecutas `server.py`, todos los cambios del editor se sincronizan
automáticamente al repo:

- **Binarios** (imagen/audio/video) suben a `assets/uploads/<sha1>.<ext>`
  y se referencian por URL relativa — el snapshot queda pequeño.
- **Estado del editor** se divide por escena en `js/data/scenes/sceneN.json`
  y un `global.json` para galería/música. Cada localStorage key se asigna
  a su escena según el prefijo del id (`^[a-z]+(\d+)-`).

Así, dos personas editando **escenas distintas** no se chocan en git: cada
una modifica un archivo distinto. Solo hay conflicto si dos personas editan
la **misma** escena al mismo tiempo, o ambas tocan `global.json`.

**Convención recomendada**: avisar por chat antes de editar una escena,
hacer `git pull --rebase` antes de abrir el editor y `git push` apenas
termines.

---

## Audio

Tres capas de audio se mezclan:

1. **Global** — música continua. Se declara en `js/data/story.json` como
   `"globalAudio"`. Loop suave que acompaña toda la lectura.
2. **Ambient por capítulo** — fondo que cambia con el capítulo. Se declara
   en cada `js/chapters/chapterN.js` como `ambient: 'assets/sounds/ambient/capN.mp3'`.
3. **Por panel / burbuja**:
   - `sfx`: efecto corto al entrar al panel.
   - `audio`: voz narrada one-shot al entrar al panel.
   - Audio por burbuja: se reproduce cuando la burbuja arranca la animación
     de typewriter. El typewriter espera el evento `audio:unlocked` antes
     del primer panel para que la primera burbuja sí dispare su sonido.

El primer gesto del usuario sobre la pantalla "desbloquea" el audio (política
de autoplay del navegador). Hay un botón de mute en la esquina superior derecha.

---

## Inmersión visual

- **Tinte de fondo automático** (`panelLoader.applyPanelTint`): el promedio
  RGB de la imagen del panel se mezcla con blanco al 55% y se aplica como
  background del `.panel__media`, más una sombra/aura coloreada que tiñe
  el papel crema alrededor. Cada panel se "derrite" en el fondo en lugar
  de cortar como una caja.
- **Luciérnagas** (`js/immersion.js`): hasta 200 partículas doradas con
  triple capa de halo (`globalCompositeOperation: 'lighter'`) flotan detrás
  de los paneles. Mezcla de "luciérnagas" lentas y "polvo dorado" rápido.
  Respeta `prefers-reduced-motion`.
- **Typewriter** (`js/typewriter.js`): cada diálogo se escribe letra por
  letra con pausas naturales en signos de puntuación.

---

## Paleta y tipografías

Definidas en `js/data/story.json → theme`:

| Token       | Color     | Uso                           |
| ----------- | --------- | ----------------------------- |
| `primary`   | `#1F4E79` | Azul profundo (UI, acentos)   |
| `accent`    | `#C9A227` | Dorado (acentos cálidos)      |
| `bg`        | `#F4F1E8` | Crema papel (fondo general)   |
| `warm`      | `#B85C38` | Naranja terracota             |
| `sunrise`   | `#E8B547` | Amanecer / atardecer          |
| `water`     | `#3D7FB8` | Agua / río                    |
| `field`     | `#7A8B5E` | Campo / vegetación            |
| `river`     | `#9B6B9E` | Río Cauca                     |
| `hope`      | `#5BA66B` | Esperanza, sopa final         |

Fuentes (Google Fonts):

- **Fredoka** — títulos.
- **Patrick Hand** — texto del cuento.

---

## Atajos de teclado (modo edición)

| Atajo               | Acción                                     |
| ------------------- | ------------------------------------------ |
| `Ctrl+Z`            | Deshacer                                   |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Rehacer                              |
| `Delete` / `Backspace` | Eliminar burbuja o personaje seleccionado |
| Click sobre el lienzo | Deseleccionar                            |

---

## Notas de accesibilidad

- Las animaciones respetan `prefers-reduced-motion`.
- Hay un botón de mute global.
- Texto sencillo, oraciones cortas: pensado para primeros lectores y para
  leer en voz alta con un adulto.

---

## Créditos

- **Historia, arte y código:** Oscar Muñoz (ComicElectiva).
- **Personajes:** Bongo, Narrador, Niña del charco.
- **Fuentes:** Fredoka & Patrick Hand (Google Fonts, OFL).
- **Sonidos:** ver `assets/sounds/CREDITS.md` cuando se añadan.

Hecho con cariño para pensar el agua, la comida y el río Cauca.
