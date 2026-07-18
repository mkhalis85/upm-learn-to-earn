import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        upm: {
          DEFAULT: "#0b6b3a",    // UPM green (secondary, from crest)
          dark: "#07361f",
          deep: "#f3f4f8",       // page background (corporate light grey)
          surface: "#ffffff",    // card surface
          border: "#e4e6ee",     // card border
          light: "#f9edf1",      // crimson-tinted hover surface
          gold: "#ae0435",       // PRIMARY accent — UPM crimson (from official template)
          goldDark: "#7e0c2d",   // deep maroon
          red: "#ae0435",
          text: "#171923",       // near-black text
          muted: "#5f6473",      // secondary text
        },
      },
    },
  },
  plugins: [],
};
export default config;
