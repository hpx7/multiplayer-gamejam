import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../", "");
  return {
    build: { target: "esnext" },
    define: {
      "process.env": { APP_SECRET: env.APP_SECRET },
    },
    server: { host: "0.0.0.0" },
    clearScreen: false,
    envDir: "../",
  };
});
