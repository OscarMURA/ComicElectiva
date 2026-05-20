/* Capítulo 1 — La casita en el árbol
 * Lumi vive dentro de un árbol hueco. Una noche, una estrella cae cerca de su
 * casita y la despierta.
 */
window.Chapters = window.Chapters || {};
window.Chapters[1] = {
  id: 1,
  title: 'La casita en el árbol',
  ambient: 'assets/sounds/ambient/cap1.mp3',
  panels: [
    {
      id: 'c1-p1',
      image: 'assets/images/panels/cap1-panel1.svg',
      narration: 'Había una vez un bosque muy, muy callado. La luna grande lo cuidaba todo desde el cielo.',
      dialogues: [],
      sfx: 'assets/sounds/effects/wind.mp3',
      audio: 'assets/sounds/narration/cap1-panel1.mp3'
    },
    {
      id: 'c1-p2',
      image: 'assets/images/panels/cap1-panel2.svg',
      narration: 'Dentro de un árbol hueco vivía Lumi, una lucecita redondita. Estaba durmiendo abrazada a su colita de estrella.',
      dialogues: [
        { speaker: 'lumi', text: 'Mmm... zzz...', position: 'center', x: 50, y: 55, width: 30 }
      ]
    },
    {
      id: 'c1-p3',
      image: 'assets/images/panels/cap1-panel3.svg',
      narration: 'De pronto, ¡una estrella fugaz cruzó el cielo y cayó cerquita del árbol!',
      dialogues: [
        { speaker: '', text: '¡Plop!', position: 'bottom-right', x: 80, y: 70, width: 22 }
      ],
      sfx: 'assets/sounds/effects/star-fall.mp3'
    },
    {
      id: 'c1-p4',
      image: 'assets/images/panels/cap1-panel4.svg',
      narration: 'Lumi se despertó y asomó la cabecita por la ventana.',
      dialogues: [
        { speaker: 'lumi', text: '¿Qué fue ese ruidito?', position: 'bottom-left', x: 22, y: 72, width: 34 }
      ],
      sfx: 'assets/sounds/effects/wake.mp3'
    },
    {
      id: 'c1-p5',
      image: 'assets/images/panels/cap1-panel5.svg',
      narration: 'Curiosa, Lumi salió de su casita. Sus destellos iluminaron el caminito del bosque.',
      dialogues: [
        { speaker: 'lumi', text: '¡Voy a ver qué pasó!', position: 'bottom-right', x: 78, y: 72, width: 34 }
      ],
      sfx: 'assets/sounds/effects/footstep.mp3'
    }
  ]
};
