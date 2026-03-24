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
  return request("/usuarios/register", {
    method: "POST",
    body: JSON.stringify({ nombre }),
  });
}

export async function obtenerMiSesion(): Promise<Usuario> {
  return request("/usuarios/me");
}

export async function cerrarSesion() {
  return request("/usuarios/logout", {
    method: "POST",
  });
}

export async function obtenerMiCartilla(): Promise<Cartilla> {
  return request("/cartillas/mi");
}

export async function firmarCasilla(payload: {
  cartilla_id: number;
  casilla_id: number;
  codigo_firmador: string;
}) {
  return request("/firmas/firmar", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error || "Error de red");
  }

  return data;
}

