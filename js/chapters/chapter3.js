/* Capítulo 3 — Un bosque de estrellas
 * Lumi, con la ayuda de las lucecitas, vuela por el bosque encendiendo cada
 * estrella dormida. El bosque vuelve a brillar.
 */
window.Chapters = window.Chapters || {};
window.Chapters[3] = {
  id: 3,
  title: 'Un bosque de estrellas',
  ambient: 'assets/sounds/ambient/cap3.mp3',
  panels: [
    {
      id: 'c3-p1',
      image: 'assets/images/panels/cap3-panel1.svg',
      narration: 'Lumi se elevó por el aire. Las lucecitas del bosque la siguieron, volando en fila.',
      dialogues: [
        { speaker: 'lucesitas', text: '¡Vamos, vamos contigo!', position: 'top-right', x: 74, y: 22, width: 36 }
      ],
      sfx: 'assets/sounds/effects/sparkle.mp3',
      audio: 'assets/sounds/narration/cap3-panel1.mp3'
    },
    {
      id: 'c3-p2',
      image: 'assets/images/panels/cap3-panel2.svg',
      narration: 'En una flor encontró la primera estrella, dormidita y muy chiquita.',
      dialogues: [
        { speaker: 'lumi', text: '¡Mira, una estrellita!', position: 'top-left', x: 24, y: 24, width: 34 }
      ]
    },
    {
      id: 'c3-p3',
      image: 'assets/images/panels/cap3-panel3.svg',
      narration: 'Lumi la tocó suavecito con su colita... y la estrella brilló.',
      dialogues: [
        { speaker: '', text: '¡Ting!', position: 'center', x: 50, y: 35, width: 22 },
        { speaker: 'lumi', text: '¡Funciona!', position: 'bottom-right', x: 76, y: 78, width: 28 }
      ],
      sfx: 'assets/sounds/effects/ting.mp3'
    },
    {
      id: 'c3-p4',
      image: 'assets/images/panels/cap3-panel4.svg',
      narration: 'Voló y voló por todo el bosque, encendiendo una, dos, muchas estrellas.',
      dialogues: [
        { speaker: '', text: '¡Ting! ¡Ting! ¡Ting!', position: 'center', x: 50, y: 45, width: 44 }
      ],
      sfx: 'assets/sounds/effects/sparkle.mp3'
    },
    {
      id: 'c3-p5',
      image: 'assets/images/panels/cap3-panel5.svg',
      narration: 'El bosque entero se llenó de luz. Lumi y el búho miraron al cielo, felices.',
      dialogues: [
        { speaker: 'buho', text: 'Lo lograste, pequeña luz.', position: 'top-right', x: 74, y: 24, width: 36 },
        { speaker: 'lumi', text: '¡Lo logramos juntos!', position: 'bottom-left', x: 24, y: 76, width: 36 }
      ],
      sfx: 'assets/sounds/effects/cheer.mp3',
      audio: 'assets/sounds/narration/cap3-panel5.mp3'
    }
  ]
};
