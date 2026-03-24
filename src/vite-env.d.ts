/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GROQ_API_KEY: string
  readonly VITE_UPSTASH_REDIS_REST_URL: string
  readonly VITE_UPSTASH_REDIS_REST_TOKEN: string
  readonly VITE_DATA_GOV_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
