/**
 * BINGO: puntajes y preguntas.
 *
 * Este archivo es lo unico que hay que tocar para cambiar el bingo. Cada
 * cartilla toma 9 preguntas al azar de esta lista (minimo 9). Los cambios se
 * aplican al lanzar el siguiente bingo; los que ya estan en curso no cambian.
 */
module.exports = {
  /** Puntos por cada casilla firmada. */
  cellPoints: 5,
  /** Puntos al completar las 9 casillas. */
  completePoints: 50,
  /** Extra para el 1ro, 2do y 3ro en completar. */
  podiumBonus: [30, 20, 10],

  prompts: [
    "Encuentra a alguien que venga por primera vez a un evento de GDG",
    "Encuentra a alguien que haya viajado desde fuera de Arequipa",
    "Encuentra a alguien que desarrolle apps Android",
    "Encuentra a alguien que haya usado Flutter",
    "Encuentra a alguien que ya haya probado Gemini",
    "Encuentra a alguien que use Firebase en algun proyecto",
    "Encuentra a alguien que haya desplegado algo en la nube",
    "Encuentra a alguien que trabaje en frontend o desarrollo web",
    "Encuentra a alguien que trabaje con datos o analitica",
    "Encuentra a alguien que este construyendo algo con IA",
    "Encuentra a alguien que sepa un lenguaje de programacion que tu no",
    "Encuentra a alguien que haya contribuido a un proyecto open source",
    "Encuentra a alguien con quien intercambiar LinkedIn o GitHub",
    "Encuentra a alguien que busque equipo para un proyecto",
    "Encuentra a alguien que quiera emprender o ya tenga una startup",
    "Encuentra a alguien que haya participado en una hackathon",
    "Encuentra a alguien que te cuente su bug mas raro",
    "Encuentra a alguien que haya trasnochado programando",
    "Encuentra a alguien que tome mas cafe que tu",
    "Encuentra a alguien que quiera dar una charla algun dia",
    "Encuentra a alguien que te recomiende una charla de hoy",
    "Encuentra a alguien que use Linux como sistema principal",
    "Encuentra a alguien que prefiera el modo claro en su editor",
    "Encuentra a alguien que haya roto produccion alguna vez",
    "Encuentra a alguien que este aprendiendo Kotlin, Go o Rust",
    "Encuentra a alguien con mas de 10 stickers en su laptop",
    "Encuentra a alguien que sea mentor o quiera serlo",
    "Encuentra a alguien que haya hecho deploy un viernes",
    "Encuentra a alguien que trabaje remoto para otro pais",
    "Encuentra a alguien que haya usado Google Cloud",
  ],
};
