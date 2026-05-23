/* Capítulo 1 · Acto I — La serpiente que tose
 * Patio · 7:00 AM. Incluye el Prólogo (Bongo habla) en el primer panel.
 *
 * Estructura editable: cada panel trae narración + un diálogo de Bongo
 * como placeholder. Tu puedes:
 *  - editar el texto haciendo clic sobre la burbuja (modo edición)
 *  - mover, redimensionar o eliminar burbujas
 *  - subir un fondo nuevo o un audio para cada panel
 */
window.Chapters = window.Chapters || {};
window.Chapters[1] = {
  id: 1,
  title: 'La serpiente que tose',
  ambient: 'assets/sounds/ambient/cap1.mp3',
  panels: [
    {
      id: 'e1-p1',
      image: '',
      narration: 'Prólogo · Bongo habla. (Editá este texto cuando estés listo)',
      dialogues: [
        { speaker: 'bongo', text: 'Hola, soy Bongo. Voy a contarte lo que siento.', position: 'top-left', x: 28, y: 28, width: 40 }
      ]
    },
    {
      id: 'e1-p2',
      image: '',
      narration: 'Patio · 7:00 AM. (Narración pendiente)',
      dialogues: [
        { speaker: 'bongo', text: '...', position: 'bottom-right', x: 72, y: 70, width: 32 }
      ]
    },
    {
      id: 'e1-p3',
      image: '',
      narration: '',
      dialogues: [
        { speaker: 'bongo', text: '...', position: 'center', x: 50, y: 50, width: 40 }
      ]
    }
  ]
};
