"use client";

import {
  Cartilla,
  Usuario,
  cerrarSesion as cerrarSesionApi,
  firmarCasilla as firmarCasillaApi,
  obtenerMiCartilla,
  obtenerMiSesion,
  registrarUsuario,
} from "@/lib/api";
import { createContext, useContext, useEffect, useState } from "react";

type GameContextValue = {
  user: Usuario | null;
  cartilla: Cartilla | null;
  loading: boolean;
  error: string;
  registerWithName: (nombre: string) => Promise<void>;
  signCell: (casillaId: number, codigoFirmador: string) => Promise<void>;
  changeUser: () => Promise<void>;
  clearError: () => void;
};

const GameContext = createContext<GameContextValue | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [cartilla, setCartilla] = useState<Cartilla | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    hydrateSession();
  }, []);

  const value: GameContextValue = {
    user,
    cartilla,
    loading,
    error,
    registerWithName,
    signCell,
    changeUser,
    clearError: () => setError(""),
  };

  async function hydrateSession() {
    try {
      const currentUser = await obtenerMiSesion();
      const currentCartilla = await obtenerMiCartilla();
      setUser(currentUser);
      setCartilla(currentCartilla);
    } catch {
      // Sin sesión activa al entrar.
    }
  }

  async function registerWithName(nombre: string) {
    setLoading(true);
    setError("");
    try {
      const response = await registrarUsuario(nombre);
      setUser(response.user);
      setCartilla(response.cartilla);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function signCell(casillaId: number, codigoFirmador: string) {
    if (!cartilla) return;
    setLoading(true);
    setError("");
    try {
      await firmarCasillaApi({
        cartilla_id: cartilla.id,
        casilla_id: casillaId,
        codigo_firmador: codigoFirmador.trim().toUpperCase(),
      });
      const nextCartilla = await obtenerMiCartilla();
      setCartilla(nextCartilla);
    } catch (e) {
      setError(getErrorMessage(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function changeUser() {
    setLoading(true);
    setError("");
    try {
      await cerrarSesionApi();
      setUser(null);
      setCartilla(null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGame debe usarse dentro de GameProvider");
  }
  return ctx;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Algo salio mal";
}

