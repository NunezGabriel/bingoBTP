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
  progreso: string;
  completas: boolean;
};

export type AdminProgresoResponse = {
  ronda: {
    id: number;
    nombre: string;
    activa: boolean;
  };
  participantes: AdminProgresoItem[];
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

