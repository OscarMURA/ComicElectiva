# Sonidos — Lumi y el Bosque Estrellado

Esta carpeta contiene el audio del cuento. Los archivos **no están incluidos**
en el repositorio (no podemos generarlos por ti). Aquí tienes la lista de
sonidos esperados, dónde colocarlos y de dónde puedes obtenerlos.

## Estructura

```
assets/sounds/
├── ambient/      # Música global + fondo por capítulo (loop suave)
├── effects/      # Efectos puntuales (sfx) que se disparan en paneles
└── narration/    # Voz narrada opcional por panel (one-shot al entrar)
```

## Archivos esperados

### Ambient (música de fondo)

| Archivo                       | Descripción                                                  |
| ----------------------------- | ------------------------------------------------------------ |
| `ambient/global.mp3`          | Música continua del cuento entero. Loop, volumen suave, se reproduce de fondo bajo el ambient del capítulo. |
| `ambient/cap1.mp3`            | Bosque nocturno tranquilo: grillos, viento suave, hojitas.   |
| `ambient/cap2.mp3`            | Bosque diurno con ululato lejano de búho, pajaritos suaves.  |
| `ambient/cap3.mp3`            | Música mágica/celestial, campanitas suaves, sensación de vuelo. |

### Effects (efectos puntuales)

| Archivo                       | Cuándo se usa                                                |
| ----------------------------- | ------------------------------------------------------------ |
| `effects/wind.mp3`            | Brisa suave (Cap 1 · Panel 1).                               |
| `effects/star-fall.mp3`       | Estrella fugaz cayendo + "plop" (Cap 1 · Panel 3).           |
| `effects/wake.mp3`            | Lumi se despierta sorprendida (Cap 1 · Panel 4).             |
| `effects/footstep.mp3`        | Pasitos en hojas secas (Cap 1 · Panel 5).                    |
| `effects/hoot.mp3`            | Ulu-ulú del búho (Cap 2 · Panel 2).                          |
| `effects/sparkle.mp3`         | Destellitos mágicos (Cap 2 · Panel 5 y Cap 3 · Panel 4).     |
| `effects/ting.mp3`            | "Ting!" cuando una estrella se enciende (Cap 3 · Panel 3).   |
| `effects/cheer.mp3`           | Festejo final, pequeño coro alegre (Cap 3 · Panel 5).        |

### Narration (voz narrada opcional)

Son archivos **opcionales** — si no existen, el `audioManager` falla
silenciosamente y el panel se reproduce sin voz.

| Archivo                          | Cuándo se usa                                              |
| -------------------------------- | ---------------------------------------------------------- |
| `narration/cap1-panel1.mp3`      | Apertura del cuento (Cap 1 · Panel 1).                     |
| `narration/cap2-panel1.mp3`      | Lumi llega al árbol enorme (Cap 2 · Panel 1).              |
| `narration/cap3-panel1.mp3`      | Lumi alza el vuelo con las lucecitas (Cap 3 · Panel 1).    |
| `narration/cap3-panel5.mp3`      | Clímax: el bosque entero brilla (Cap 3 · Panel 5).         |

## Formato

- **Formato:** `.mp3` (compatible con todos los navegadores).
- **Bitrate sugerido:** 96–128 kbps para efectos cortos, 128–192 kbps para ambient.
- **Duración:**
  - Ambient: 30–60 s, loop limpio (sin click al ciclar).
  - Effects: 0.5–3 s.
- **Volumen:** normalizado a ~-14 LUFS para que ningún sonido sobresalte a los niños.

## ¿Dónde conseguir los sonidos?

- **[Freesound](https://freesound.org/)** — Banco enorme, licencias CC. Busca términos como `forest night ambient`, `owl hoot`, `magic ting`, `cute pop`, `cheer kids`.
- **[Pixabay Sound Effects](https://pixabay.com/sound-effects/)** — Licencia libre, sin atribución obligatoria.
- **[Zapsplat](https://www.zapsplat.com/)** — Requiere cuenta gratuita.
- **[BBC Sound Effects](https://sound-effects.bbcrewind.co.uk/)** — Uso personal/educativo gratis.

> Sugerencia: tras descargar, recorta y normaliza el volumen con
> [Audacity](https://www.audacityteam.org/) (gratis). Exporta como MP3.

## Cómo se referencian desde el código

Cada panel en `js/chapters/chapterN.js` puede tener un campo `sfx`:

```js
{
  id: 'c1-p3',
  image: 'assets/images/panels/cap1-panel3.svg',
  narration: '...',
  dialogues: [],
  sfx: 'assets/sounds/effects/star-fall.mp3'
}
```

Y cada capítulo declara su ambient en la raíz:

```js
window.Chapters[1] = {
  id: 1,
  title: '...',
  ambient: 'assets/sounds/ambient/cap1.mp3',
  panels: [ ... ]
};
```

`audioManager.js` se encarga de reproducir/parar los sonidos automáticamente
según el panel visible.

## Licencias

Recuerda guardar la atribución (si la licencia la pide) en un archivo
`CREDITS.md` dentro de esta carpeta cuando añadas sonidos descargados.
