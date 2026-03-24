"use client";

import {
  Cartilla,
  Firma,
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

  useEffect(() => {
    if (!user || user.tipo !== "PARTICIPANT") {
      return;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const nextCartilla = await obtenerMiCartilla();
        setCartilla((prev) =>
          prev &&
          prev.id === nextCartilla.id &&
          prev.rondaId === nextCartilla.rondaId &&
          prev.firmas.length === nextCartilla.firmas.length
            ? prev
            : nextCartilla,
        );
      } catch {
        // Si no hay ronda activa o aun no tiene cartilla, se mantiene estado actual.
      }
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [user]);

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
      setUser(currentUser);
      try {
        const currentCartilla = await obtenerMiCartilla();
        setCartilla(currentCartilla);
      } catch {
        setCartilla(null);
      }
    } catch {
      setUser(null);
      setCartilla(null);
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
      const result = await firmarCasillaApi({
        cartilla_id: cartilla.id,
        casilla_id: casillaId,
        codigo_firmador: codigoFirmador.trim().toUpperCase(),
      });

      if (result.ganador) {
        setCartilla((prev) => {
          if (!prev) return prev;
          const alreadySigned = prev.firmas.some((f) => f.casillaId === casillaId);
          if (alreadySigned) {
            return { ...prev, completo: true };
          }
          const syntheticFirma: Firma = {
            id: Date.now(),
            cartillaId: prev.id,
            casillaId,
            firmadoPorId: -1,
            firmadoAId: prev.participantId,
          };
          return {
            ...prev,
            completo: true,
            firmas: [...prev.firmas, syntheticFirma],
          };
        });
      } else {
        const nextCartilla = await obtenerMiCartilla();
        setCartilla(nextCartilla);
      }
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

