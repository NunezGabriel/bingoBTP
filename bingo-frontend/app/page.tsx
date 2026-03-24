"use client";

import MainView from "@/views/mainView";
import StartView from "@/views/startView";
import { useGame } from "@/context/GameContext";

export default function Home() {
  const { user, cartilla, loading, error, registerWithName, signCell, changeUser } =
    useGame();

  if (!user || !cartilla) {
    return <StartView onStart={registerWithName} loading={loading} errorMessage={error} />;
  }

  return (
    <MainView
      cartilla={cartilla}
      playerName={user.nombre}
      playerCode={user.codigo}
      onSignCell={signCell}
      onChangeUser={changeUser}
      errorMessage={error}
      loading={loading}
    />
  );
}
