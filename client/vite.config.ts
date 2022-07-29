import { defineConfig } from "vite";

export default defineConfig({
  build: { target: "esnext" },
  define: {
    "process.env": { APP_SECRET: process.env.APP_SECRET },
  },
  server: { host: "0.0.0.0" },
  clearScreen: false,
});
