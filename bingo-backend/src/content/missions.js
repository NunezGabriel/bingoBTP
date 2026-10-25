/**
 * La tarjeta de misiones del evento.
 *
 * Son cuatro acciones que el participante hace durante el evento y que un
 * admin valida escaneando su QR (o escribiendo su codigo de 6 letras si la
 * camara no esta disponible). No dan puntos: completar las cuatro es el
 * requisito para el premio grande del final, y punto.
 *
 * Para cambiarlas, se edita este archivo y se vuelve a desplegar: no hay
 * pantalla para crear misiones.
 */
module.exports = {
  missions: [
    {
      id: "redes",
      title: "Siguenos en nuestras redes",
      detail: "Instagram, TikTok y LinkedIn de GDG Arequipa.",
      hint: "Muestrale a un organizador las tres cuentas seguidas.",
      icon: "heart",
    },
    {
      id: "pregunta",
      title: "Haz una pregunta a un ponente",
      detail: "En cualquier charla, en voz alta o en el espacio de preguntas.",
      hint: "Despues de preguntar, acercate a un organizador.",
      icon: "chat",
    },
    {
      id: "whatsapp",
      title: "Unete a nuestra comunidad de WhatsApp",
      detail: "El grupo donde se anuncian los siguientes eventos.",
      hint: "Muestra que ya estas dentro del grupo.",
      icon: "users",
    },
    {
      id: "historia",
      title: "Sube una historia",
      detail: "Una foto o video del evento etiquetando a @gdgarequipa.",
      hint: "Muestra la historia publicada con la etiqueta.",
      icon: "camera",
    },
  ],
};
