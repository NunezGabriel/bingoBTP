import { redirect } from "next/navigation";

/**
 * No hay portada: quien abre el link quiere entrar, no leer. La pantalla de
 * entrada ya muestra que evento esta en vivo.
 */
export default function Home() {
  redirect("/entrar");
}
