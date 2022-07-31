import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  return {
    build: { target: "esnext" },
    server: { host: "0.0.0.0" },
    clearScreen: false,
    envDir: "../",
    envPrefix: "APP_ID",
    publicDir: "src/assets",
  };
});
