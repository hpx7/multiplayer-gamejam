import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    build: { target: "esnext", assetsInlineLimit: 0 },
    base: "",
    envDir: "../",
    envPrefix: "HATHORA_",
    publicDir: "src/assets",
    server: { host: "0.0.0.0" },
    clearScreen: false,
  };
});
