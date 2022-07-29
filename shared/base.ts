import { sha256 } from "crypto-hash";

export const APP_SECRET = process.env.APP_SECRET!;
export const APP_ID = await sha256(APP_SECRET);
