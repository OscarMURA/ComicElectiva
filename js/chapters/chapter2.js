/* Capítulo 2 — El búho de los lentes
 * Lumi conoce al Búho Sabio que le cuenta que las estrellas del bosque se han
 * apagado, y solo una luz pequeña y valiente puede despertarlas.
 */
window.Chapters = window.Chapters || {};
window.Chapters[2] = {
  id: 2,
  title: 'El búho de los lentes',
  ambient: 'assets/sounds/ambient/cap2.mp3',
  panels: [
    {
      id: 'c2-p1',
      image: 'assets/images/panels/cap2-panel1.svg',
      narration: 'Lumi caminó y caminó hasta encontrar un árbol enorme, muy alto, muy alto.',
      dialogues: [
        { speaker: 'lumi', text: '¡Guau, qué grande!', position: 'bottom-right', x: 78, y: 78, width: 32 }
      ],
      audio: 'assets/sounds/narration/cap2-panel1.mp3'
    },
    {
      id: 'c2-p2',
      image: 'assets/images/panels/cap2-panel2.svg',
      narration: 'Arriba, en una rama, un búho con lentes redondos la miraba.',
      dialogues: [
        { speaker: 'buho', text: 'Uhú... uhú... ¿quién anda por ahí?', position: 'top-left', x: 22, y: 18, width: 38 }
      ],
      sfx: 'assets/sounds/effects/hoot.mp3'
    },
    {
      id: 'c2-p3',
      image: 'assets/images/panels/cap2-panel3.svg',
      narration: 'El búho bajó despacito y se acomodó los lentes.',
      dialogues: [
        { speaker: 'buho', text: 'Mucho gusto, pequeña luz. Soy el Búho Sabio.', position: 'top-left', x: 24, y: 22, width: 40 },
        { speaker: 'lumi', text: '¡Hola! Yo soy Lumi.', position: 'bottom-right', x: 76, y: 74, width: 32 }
      ]
    },
    {
      id: 'c2-p4',
      image: 'assets/images/panels/cap2-panel4.svg',
      narration: 'El búho miró al cielo y suspiró.',
      dialogues: [
        { speaker: 'buho', text: 'Las estrellas del bosque se durmieron. Nadie las puede despertar...', position: 'top-left', x: 26, y: 18, width: 44 },
        { speaker: 'buho', text: '...sólo una luz pequeñita y valiente.', position: 'top-right', x: 72, y: 48, width: 38 }
      ]
    },
    {
      id: 'c2-p5',
      image: 'assets/images/panels/cap2-panel5.svg',
      narration: 'Lumi infló el pechito, valiente.',
      dialogues: [
        { speaker: 'lumi', text: '¡Yo las voy a despertar!', position: 'bottom-right', x: 76, y: 76, width: 36 },
        { speaker: 'buho', text: 'Sabía que tú podrías. ¡Vuela, Lumi!', position: 'top-left', x: 24, y: 20, width: 38 }
      ],
      sfx: 'assets/sounds/effects/sparkle.mp3'
    }
  ]
};
