import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        upm: { DEFAULT: "#0b6b3a", dark: "#084f2b", light: "#e8f5ee", accent: "#f5b301" },
      },
    },
  },
  plugins: [],
};
export default config;
