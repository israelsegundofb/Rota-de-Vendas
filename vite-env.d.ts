/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_KEY: string
    readonly VITE_RECAPTCHA_SITE_KEY: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
