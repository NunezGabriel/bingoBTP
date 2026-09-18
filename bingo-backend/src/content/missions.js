/**
 * MISIONES que entrega el staff: el jugador le dicta su codigo y el staff
 * toca la mision. Editar esta lista para cambiarlas.
 *
 * - key: identificador corto y unico. No lo cambies una vez usado en un evento.
 * - repeatable: true = se puede dar varias veces (ej. cada pregunta en una charla).
 *               false = una sola vez por evento.
 */
module.exports = [
  { key: "pregunta", title: "Hizo una pregunta en una charla", points: 20, repeatable: true },
  { key: "stand", title: "Visito el stand de un sponsor", points: 10, repeatable: true },
  { key: "foto-speaker", title: "Foto con un speaker", points: 30, repeatable: false },
  { key: "redes", title: "Compartio el evento en redes", points: 25, repeatable: false },
  { key: "proyecto", title: "Presento su proyecto en el escenario", points: 100, repeatable: false },
];
