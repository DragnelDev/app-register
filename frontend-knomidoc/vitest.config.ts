import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

/**
 * Configuración de Vitest. Es independiente de vite.config.ts a propósito:
 * no carga vite-plugin-vue-devtools ni el JSX (innecesarios en los tests).
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.spec.ts'],
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/stores/**', 'src/utils/**', 'src/components/**', 'src/modules/**/components/**'],
      exclude: ['src/**/__tests__/**', 'src/test/**'],
    },
  },
})
