const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export type Usuario = {
  id: number;
  nombre: string;
  codigo: string;
  tipo: "ADMIN" | "PARTICIPANT";
};

export type Casilla = {
  id: number;
  numero: number;
  pregunta: string;
};

export type RelacionCasilla = {
  id: number;
  casillaId: number;
  casilla: Casilla;
};

export type Firma = {
  id: number;
  cartillaId: number;
  casillaId: number;
  firmadoPorId: number;
  firmadoAId: number;
};

export type Cartilla = {
  id: number;
  participantId: number;
  rondaId: number;
  completo: boolean;
  casillas: RelacionCasilla[];
  firmas: Firma[];
};

export async function registrarUsuario(nombre: string): Promise<{
  user: Usuario;
  cartilla: Cartilla;
}> {
  return request<{ user: Usuario; cartilla: Cartilla }>("/usuarios/register", {
    method: "POST",
    body: JSON.stringify({ nombre }),
  });
}

export async function obtenerMiSesion(): Promise<Usuario> {
  return request<Usuario>("/usuarios/me");
}

export async function loginPorCodigo(codigo: string): Promise<Usuario> {
  return request<Usuario>("/usuarios/login", {
    method: "POST",
    body: JSON.stringify({ codigo }),
  });
}

export async function cerrarSesion() {
  return request("/usuarios/logout", {
    method: "POST",
  });
}

export async function obtenerMiCartilla(): Promise<Cartilla> {
  return request<Cartilla>("/cartillas/mi");
}

export async function firmarCasilla(payload: {
  cartilla_id: number;
  casilla_id: number;
  codigo_firmador: string;
}) {
  return request<{ ok?: boolean; ganador?: boolean; progreso: number }>(
    "/firmas/firmar",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export type AdminProgresoItem = {
  usuarioId: number;
  nombre: string;
  codigo: string;
  cartillaId: number;
  firmas: number;
  totalCasillas: number;
  progreso: string;
  completas: boolean;
};

export type AdminKpis = {
  totalParticipantes: number;
  bingos: number;
  enJuego: number;
  sinEmpezar: number;
  firmasTotales: number;
  avancePromedio: number;
};

export type AdminProgresoResponse = {
  ronda: {
    id: number;
    nombre: string;
    activa: boolean;
  };
  kpis: AdminKpis;
  participantes: AdminProgresoItem[];
  actualizadoEn: string;
};

export async function obtenerProgresoAdmin(): Promise<AdminProgresoResponse> {
  return request<AdminProgresoResponse>("/rondas/admin/progreso");
}

export async function crearNuevaRondaAdmin(): Promise<{
  ronda: { id: number; nombre: string; activa: boolean };
  totalParticipantes: number;
}> {
  return request<{ ronda: { id: number; nombre: string; activa: boolean }; totalParticipantes: number }>(
    "/rondas/admin/crear",
    {
      method: "POST",
    },
  );
}

export async function finalizarRondaAdmin(): Promise<{
  ok: boolean;
  ronda: { id: number; nombre: string; activa: boolean };
}> {
  return request<{ ok: boolean; ronda: { id: number; nombre: string; activa: boolean } }>(
    "/rondas/admin/finalizar",
    {
      method: "POST",
    },
  );
}

export async function eliminarUsuarioAdmin(usuarioId: number): Promise<{
  ok: boolean;
  usuario: { id: number; nombre: string; codigo: string };
  cartillasEliminadas: number;
  firmasEliminadas: number;
}> {
  return request(`/usuarios/${usuarioId}`, { method: "DELETE" });
}

export async function eliminarTodosLosParticipantesAdmin(): Promise<{
  ok: boolean;
  usuariosEliminados: number;
  cartillasEliminadas: number;
}> {
  return request("/usuarios/participantes", { method: "DELETE" });
}

/**
 * Suscripcion en vivo al progreso de la ronda (Server-Sent Events).
 * Devuelve la funcion para cerrar la conexion.
 */
export function suscribirProgresoAdmin(handlers: {
  onProgreso: (data: AdminProgresoResponse) => void;
  onSinRonda: () => void;
  onEstado?: (conectado: boolean) => void;
}): () => void {
  const source = new EventSource(`${API_BASE_URL}/rondas/admin/stream`, {
    withCredentials: true,
  });

  source.addEventListener("progreso", (event) => {
    try {
      handlers.onProgreso(JSON.parse((event as MessageEvent).data));
      handlers.onEstado?.(true);
    } catch {
      // Evento malformado: se ignora y se espera el siguiente.
    }
  });

  source.addEventListener("sin-ronda", () => {
    handlers.onSinRonda();
    handlers.onEstado?.(true);
  });

  source.onopen = () => handlers.onEstado?.(true);
  source.onerror = () => handlers.onEstado?.(false);

  return () => source.close();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const text = await response.text();
  let data: { error?: string } | null = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || `Error ${response.status}`);
  }

  return data as T;
}

