import { defineConfig, loadEnv } from "vite";
import hash from "hash.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../", "");
  const appSecret = process.env.APP_SECRET ?? env.APP_SECRET;
  process.env.APP_ID = hash.sha256().update(appSecret).digest("hex");
  return {
    build: { target: "esnext" },
    server: { host: "0.0.0.0" },
    clearScreen: false,
    envDir: "../",
    envPrefix: "APP_ID",
    publicDir: "src/assets",
  };
});
