/* global process */
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { gamePages, getBasePath } from './siteConfig.js'

const htmlInputs = Object.fromEntries([
  ['index', fileURLToPath(new URL('./index.html', import.meta.url))],
  ...gamePages.map(({ slug }) => [
    slug,
    fileURLToPath(new URL(`./${slug}/index.html`, import.meta.url)),
  ]),
])

export default defineConfig({
  plugins: [react()],
  base: getBasePath(),
  build: {
    rollupOptions: {
      input: htmlInputs,
    },
  },
})
