# Lumi y el Bosque Estrellado

> Un cuento ilustrado interactivo para los pequeños soñadores (3 a 7 años).

**Lumi** es una pequeña criatura luminosa que vive dentro de un árbol hueco.
Una noche, una estrella fugaz cae cerca de su casita y la despierta. Con la
ayuda del **Búho Sabio** y de las **lucecitas** del bosque, Lumi tendrá que
viajar entre flores, hojas y caminitos para volver a encender las estrellas
dormidas y devolverle el brillo al bosque.

El cuento se lee **desplazándose hacia abajo**: cada panel aparece a pantalla
completa, con narración, diálogos y sonidos suaves.

---

## Cómo abrirlo

### Opción 1 · Doble clic

Abre `index.html` con tu navegador favorito (Firefox, Chrome, Edge).

> En algunos navegadores, abrir el archivo directamente (`file://`) impide
> cargar `data/story.json` por seguridad. Si ves la pantalla en blanco, usa
> la opción 2.

### Opción 2 · Servidor local (recomendada)

Desde la carpeta del proyecto:

```bash
# Python 3 (recomendado, viene preinstalado en Linux/Mac)
python3 -m http.server 8080

# o con Node.js
npx serve .
```

Y abre `http://localhost:8080` en el navegador.

---

## Estructura del proyecto

```
ComicElectiva/
├── index.html                  # Página principal
├── README.md                   # (este archivo)
│
├── css/                        # Estilos
│   ├── main.css
│   ├── panels.css
│   ├── responsive.css
│   └── animations.css
│
├── js/                         # Lógica
│   ├── main.js                 # Arranque general
│   ├── scrollManager.js        # Detección de panel visible
│   ├── panelLoader.js          # Carga capítulos y construye el DOM
│   ├── audioManager.js         # Global, ambient, sfx y narración
│   ├── bubbleEditor.js         # Modo edición (drag, password, persistencia)
│   ├── immersion.js            # Capa de partículas y ambiente visual
│   └── chapters/
│       ├── chapter1.js         # Contenido del capítulo 1
│       ├── chapter2.js         # Contenido del capítulo 2
│       └── chapter3.js         # Contenido del capítulo 3
│
├── data/
│   └── story.json              # Metadatos: paleta, fonts, personajes, capítulos
│
└── assets/
    ├── fonts/                  # (Reservada — usamos Google Fonts por ahora)
    ├── images/
    │   ├── panels/             # cap{1,2,3}-panel{1..5}.svg
    │   ├── characters/         # lumi.svg, buho.svg, lucesitas.svg
    │   ├── backgrounds/        # (opcional, fondos extra)
    │   └── ui/                 # (opcional, iconos UI)
    └── sounds/
        ├── README.md           # Lista de sonidos esperados
        ├── ambient/            # Música global + ambient por capítulo
        ├── effects/            # Efectos puntuales (sfx)
        └── narration/          # Voz narrada opcional por panel
```

---

## Cómo agregar un capítulo nuevo

Imagina que quieres añadir el **Capítulo 4**.

1. **Crear el archivo del capítulo** en `js/chapters/chapter4.js`:

   ```js
   window.Chapters = window.Chapters || {};
   window.Chapters[4] = {
     id: 4,
     title: 'El nuevo amanecer',
     ambient: 'assets/sounds/ambient/cap4.mp3',
     panels: [
       {
         id: 'c4-p1',
         image: 'assets/images/panels/cap4-panel1.svg',
         narration: 'Aquella mañana, el bosque despertó dorado.',
         dialogues: [
           { speaker: 'lumi', text: '¡Mira qué bonito!', position: 'left' }
         ],
         sfx: 'assets/sounds/effects/sparkle.mp3'
       }
       // ... 4 paneles más
     ]
   };
   ```

2. **Registrar el capítulo** en `data/story.json`, añadiéndolo al arreglo
   `chapters`:

   ```json
   {
     "id": 4,
     "title": "El nuevo amanecer",
     "scene": "Resumen breve del capítulo...",
     "panels": 5
   }
   ```

3. **Cargar el script** en `index.html` (junto a los otros `chapter*.js`,
   antes de `panelLoader.js`):

   ```html
   <script defer src="js/chapters/chapter4.js"></script>
   ```

4. **Crear las imágenes** de los paneles en
   `assets/images/panels/cap4-panel1.svg` … `cap4-panel5.svg`.

5. (Opcional) Añadir el ambient `assets/sounds/ambient/cap4.mp3` y los efectos.

### Formato de un panel

```js
{
  id: 'c1-p3',                                   // identificador único
  image: 'assets/images/panels/cap1-panel3.svg', // imagen de fondo del panel
  narration: 'Texto del narrador.',              // opcional
  dialogues: [                                   // opcional
    {
      speaker: 'lumi',                           // id del personaje
      text: '¡Hola!',                            // diálogo corto
      position: 'bottom-left',                   // ancla semántica
      x: 22,                                     // % horizontal del centro
      y: 72,                                     // % vertical del centro
      width: 34                                  // % de ancho (opcional)
    }
  ],
  sfx: 'assets/sounds/effects/ting.mp3',         // opcional
  audio: 'assets/sounds/narration/cap1-panel3.mp3' // opcional (voz narrada)
}
```

---

## Cómo agregar personajes

1. Crea un SVG (o PNG con fondo transparente) en
   `assets/images/characters/<id>.svg`. El **id** del archivo es el que usarás
   en los diálogos.

   Por ejemplo, para añadir una ardilla: `assets/images/characters/ardilla.svg`.

2. Descríbelo en `data/story.json`, dentro del arreglo `characters`:

   ```json
   {
     "id": "ardilla",
     "name": "Ardilla Saltarina",
     "description": "Una ardilla curiosa, color rojizo, con cola peluda."
   }
   ```

3. Úsalo en cualquier panel:

   ```js
   { speaker: 'ardilla', text: '¡Hola, Lumi!', position: 'left' }
   ```

> El nombre que aparece en el bocadillo lo controla `panelLoader.js` a partir
> del `speaker`. Si quieres mostrar el avatar del personaje, cárgalo desde CSS
> o JavaScript usando la ruta `assets/images/characters/<speaker>.svg`.

---

## Audio

El cuento tiene **tres capas de audio** que se mezclan:

1. **Global** — música continua del cuento entero. Se declara una sola vez en
   `data/story.json` bajo `"globalAudio"`. Es un loop suave que acompaña toda
   la lectura, independiente del capítulo. Archivo:
   `assets/sounds/ambient/global.mp3`.
2. **Ambient por capítulo** — fondo que cambia con el capítulo (noche, día,
   vuelo). Se declara en cada `js/chapters/chapterN.js` con el campo
   `ambient: 'assets/sounds/ambient/capN.mp3'`.
3. **Por panel** — dos tipos opcionales:
   - `sfx`: efecto corto puntual al entrar al panel (plop, ting, hoot…).
     Carpeta `assets/sounds/effects/`.
   - `audio`: voz narrada one-shot al entrar al panel (lectura del texto).
     Carpeta `assets/sounds/narration/`. Los archivos son **opcionales**: si
     no existen, `audioManager.js` falla silenciosamente.

### Cómo subir o reemplazar audio

- **Desde el editor** (modo edición activo): puedes adjuntar un archivo de
  audio y se guarda como *data URL* en `localStorage`. Útil para probar
  rápido en tu navegador sin tocar archivos.
- **En disco**: simplemente coloca o reemplaza el `.mp3` en la carpeta
  correspondiente (`ambient/`, `effects/` o `narration/`). El archivo en
  disco gana sobre el de `localStorage` si ambos existen.

Consulta la lista completa de archivos esperados en
[`assets/sounds/README.md`](./assets/sounds/README.md).

Fuentes recomendadas: [Freesound](https://freesound.org/) y
[Pixabay Sound Effects](https://pixabay.com/sound-effects/).

---

## Modo edición

Para arrastrar las burbujas de diálogo, mover personajes, cambiar textos o
subir audio desde el navegador hay un **modo edición** protegido por
contraseña.

1. Haz clic en el botón flotante con el lápiz (✏️) en la esquina.
2. Ingresa la contraseña: **`oscar22lulu`**.
3. La sesión queda autenticada **hasta que cierres la pestaña** o hagas clic
   en **"Cerrar sesión de edición"**.

Mientras estás en modo edición:

- Puedes **arrastrar** las burbujas y los personajes; sus nuevas posiciones
  se guardan automáticamente en `localStorage` (no modifican los `.js`).
- Puedes **subir audio** desde la interfaz y queda almacenado como data URL.
- Puedes **restablecer** todo con el botón correspondiente para volver al
  diseño original definido en los `chapters/*.js`.

### Cambiar la contraseña

Edita la constante `EDIT_PASSWORD` al inicio de `js/bubbleEditor.js`:

```js
const EDIT_PASSWORD = 'oscar22lulu'; // cámbiala por la que prefieras
```

Vuelve a recargar la página para que tome efecto. **No** se guarda ni se
envía a ningún servidor: vive en el código fuente.

---

## Posicionamiento de burbujas

Cada diálogo tiene coordenadas en porcentaje relativas al panel:

```js
{
  speaker: 'lumi',
  text: '¡Hola!',
  position: 'bottom-left', // ancla semántica de respaldo
  x: 22,                   // % horizontal del centro de la burbuja
  y: 72,                   // % vertical del centro de la burbuja
  width: 34                // % de ancho (opcional)
}
```

- `position` admite `top-left`, `top-right`, `center`, `bottom-left`,
  `bottom-right`, `bottom-center`. Sirve de respaldo y como ancla semántica.
- `x` y `y` van de 0 a 100, ambos referidos al **centro** de la burbuja.
- `width` es opcional. Por defecto usa **35%** para diálogos y **80%** para
  narraciones que ocupan el pie del panel.

Dos formas de editarlas:

1. **A mano**: cambia `x`, `y`, `width` directamente en
   `js/chapters/chapterN.js`. Recarga la página y listo.
2. **En modo edición**: actívalo (ver sección anterior) y arrastra cada
   burbuja a donde quieras. La posición se guarda en `localStorage` y se
   superpone sobre la definición del `.js`.

> Consejo: si dos diálogos comparten panel, mantenlos a **más de 25% de
> distancia** o ponlos uno arriba y otro abajo para que no se solapen.

---

## Inmersión

El cuento incluye una **capa de partículas suaves** sobre los paneles
(lucecitas, polvo de estrellas, hojitas) que aporta atmósfera sin distraer
de la lectura. Está implementada en `js/immersion.js` y respeta la
preferencia del sistema **`prefers-reduced-motion`**: si el usuario tiene
movimiento reducido, las partículas se desactivan automáticamente.

---

## Paleta y tipografías

Se definen en `data/story.json` y se consumen desde las hojas de estilo:

| Token        | Color     | Uso                          |
| ------------ | --------- | ---------------------------- |
| `primary`    | `#FFD66B` | Lumi, destellos, acentos.    |
| `secondary`  | `#8AC6F0` | Cielo, agua, frío.           |
| `accent`     | `#F58AB5` | Flores, mejillas, dulce.     |
| `leaf`       | `#7ED9A6` | Vegetación, suelo.           |
| `night`      | `#2A2A5C` | Cielo de noche.              |
| `cream`      | `#FFF7E6` | Fondos suaves, papel.        |
| `ink`        | `#3B2E5A` | Texto, líneas, ojos.         |

Fuentes (Google Fonts):

- **Fredoka** — títulos.
- **Patrick Hand** — texto del cuento.

---

## Notas de accesibilidad

- Todas las imágenes incluyen `alt`/`aria-label`.
- El botón de mute permite silenciar todo el audio.
- Las animaciones respetan `prefers-reduced-motion`.
- Lenguaje sencillo y oraciones cortas: pensado para primeros lectores y para
  leer en voz alta con un adulto.

---

## Créditos

- **Historia, arte y código:** ComicElectiva.
- **Personajes:** Lumi, Búho Sabio, Lucecitas.
- **Fuentes:** Fredoka & Patrick Hand (Google Fonts, OFL).
- **Sonidos:** ver `assets/sounds/CREDITS.md` cuando se añadan.

Hecho con cariño para los pequeños soñadores.
