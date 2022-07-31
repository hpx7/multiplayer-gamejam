/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
