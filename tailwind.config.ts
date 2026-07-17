import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        upm: {
          DEFAULT: "#0b6b3a",   // UPM green
          dark: "#07361f",
          deep: "#050f0a",      // page background (near-black green)
          surface: "#0c2015",   // card surface
          border: "#1d4030",    // card border
          light: "#12301f",     // hover surface
          gold: "#f5b301",      // UPM gold — primary accent
          goldDark: "#c79102",
          red: "#e11d48",       // UPM red — sparing highlights
          text: "#f0f6f1",
          muted: "#9fbfae",
        },
      },
    },
  },
  plugins: [],
};
export default config;
