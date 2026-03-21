"use client";

import MainView from "@/views/mainView";
import StartView from "@/views/startView";
import { useState } from "react";

const randomCode = () => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const first = letters[Math.floor(Math.random() * letters.length)];
  const second = letters[Math.floor(Math.random() * letters.length)];
  const number = Math.floor(Math.random() * 100).toString().padStart(2, "0");
  return `${first}${second}${number}`;
};

export default function Home() {
  const [playerName, setPlayerName] = useState("");
  const [playerCode, setPlayerCode] = useState("");
  const [hasStarted, setHasStarted] = useState(false);

  const handleStart = (name: string) => {
    setPlayerName(name);
    setPlayerCode(randomCode());
    setHasStarted(true);
  };

  if (!hasStarted) {
    return <StartView onStart={handleStart} />;
  }

  return <MainView playerName={playerName} playerCode={playerCode} />;
}
