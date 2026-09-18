import { GameShell } from "@/components/game/GameShell";

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return <GameShell>{children}</GameShell>;
}
