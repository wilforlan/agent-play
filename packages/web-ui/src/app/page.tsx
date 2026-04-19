import GameShell from "./game-shell";
import { Analytics } from "@vercel/analytics/next"

export default function HomePage() {
  return (
    <>
      <GameShell />
      <Analytics />
    </>
  );
}
