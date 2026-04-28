import { Analytics } from "@vercel/analytics/next"
import HomePageShell from "./homepage-shell";

export default function HomePage() {
  return (
    <>
      <HomePageShell />
      <Analytics />
    </>
  );
}
