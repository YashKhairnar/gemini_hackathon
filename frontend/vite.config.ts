// vite.config.ts
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import wasm from "vite-plugin-wasm"

export default defineConfig({
  // Set base to "/" for local development
  // Change to "/your-repo-name/" when deploying to GitHub Pages
  base: "/",

  build: {
    target: "esnext",
  },

  plugins: [wasm(), react()],

  worker: {
    format: "es",
    plugins: () => [wasm()],
  },
})
