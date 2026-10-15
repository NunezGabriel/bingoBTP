/**
 * La tarjeta de misiones del evento.
 *
 * Son cuatro acciones que el participante hace durante el evento y que un
 * admin valida escaneando su QR (o escribiendo su codigo de 6 letras si la
 * camara no esta disponible). Al final del evento se premia a quien completo
 * las cuatro.
 *
 * Para cambiarlas, se edita este archivo y se vuelve a desplegar: no hay
 * pantalla para crear misiones.
 */
module.exports = {
  /** Puntos extra para quien completa las cuatro. */
  bonusCompleta: 100,

  missions: [
    {
      id: "redes",
      title: "Siguenos en nuestras redes",
      detail: "Instagram, TikTok y LinkedIn de GDG Arequipa.",
      hint: "Muestrale a un organizador las tres cuentas seguidas.",
      icon: "heart",
      points: 25,
    },
    {
      id: "pregunta",
      title: "Haz una pregunta a un ponente",
      detail: "En cualquier charla, en voz alta o en el espacio de preguntas.",
      hint: "Despues de preguntar, acercate a un organizador.",
      icon: "chat",
      points: 25,
    },
    {
      id: "whatsapp",
      title: "Unete a nuestra comunidad de WhatsApp",
      detail: "El grupo donde se anuncian los siguientes eventos.",
      hint: "Muestra que ya estas dentro del grupo.",
      icon: "users",
      points: 25,
    },
    {
      id: "historia",
      title: "Sube una historia",
      detail: "Una foto o video del evento etiquetando a @gdgarequipa.",
      hint: "Muestra la historia publicada con la etiqueta.",
      icon: "camera",
      points: 25,
    },
  ],
};
