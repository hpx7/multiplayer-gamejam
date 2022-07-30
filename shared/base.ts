import path from "path";
import url from "url";
import dotenv from "dotenv";
import { sha256 } from "crypto-hash";

if (process.env.APP_SECRET === undefined) {
  const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
  if (process.env.APP_SECRET === undefined) {
    throw new Error("APP_SECRET env variable must be set");
  }
}

export const APP_SECRET = process.env.APP_SECRET;
export const APP_ID = await sha256(APP_SECRET);
