import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        cream: '#FDF8F2',
        'warm-white': '#FFFCF8',
        amber: { DEFAULT: '#E8A840', light: '#F5C96A', dark: '#C4831A' },
        sage: { DEFAULT: '#7A9E7E', light: '#A8C5AC' },
        deep: '#2C2416',
        mid: '#6B5B3E',
        muted: '#B8A48A',
      },
    },
  },
  plugins: [],
};
export default config;
