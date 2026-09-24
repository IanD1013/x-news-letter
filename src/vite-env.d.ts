/// <reference types="vite/client" />

declare const __BUILD_ID__: string;

interface ImportMetaEnv {
  /** "owner/name" of the GitHub repository, set by the workflow or a local .env. */
  readonly VITE_REPO?: string;
}
