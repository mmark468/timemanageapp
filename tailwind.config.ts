import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F6F8FB",
        ink: "#111827",
        muted: "#6B7280",
        sky: "#E8EDF5",
        skySoft: "#EEF2F7",
        lemon: "#F3F4F6",
        peach: "#ECEFF3",
        mint: "#E5E7EB",
        lavender: "#F1F3F6",
        blush: "#F8FAFC",
      },
      boxShadow: {
        soft: "0 14px 34px rgba(15, 23, 42, 0.08)",
        pill: "0 8px 18px rgba(15, 23, 42, 0.08)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
