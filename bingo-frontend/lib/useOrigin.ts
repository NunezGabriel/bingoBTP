import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Origen del sitio (https://...). En el servidor devuelve "" y en el navegador
 * el valor real, sin el render extra de un useEffect + setState.
 */
export function useOrigin() {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
}
