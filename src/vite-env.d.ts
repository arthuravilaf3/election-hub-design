/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Which edition to build: 'base' | 'creative' (default creative). */
  readonly VITE_EDITION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
