/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string
    readonly VITE_SUPABASE_ANON_KEY: string
    readonly VITE_ALLOW_LOCAL_FALLBACK?: string
    readonly VITE_ALLOW_DEV_FALLBACK?: string
    readonly DEV: boolean
    readonly PROD: boolean
    readonly MODE: string
    readonly SSR: boolean
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

export {}