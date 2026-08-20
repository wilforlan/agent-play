import { IBM_Plex_Mono, Instrument_Sans, Instrument_Serif } from "next/font/google";

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--ap-font-sans",
  display: "swap",
});

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--ap-font-display",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--ap-font-mono",
  display: "swap",
});

export const agentPlaySiteFontClassName = `${sans.variable} ${display.variable} ${mono.variable}`;
