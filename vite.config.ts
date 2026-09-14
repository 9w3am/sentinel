import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// base './' + HashRouter → GitHub Pages 등 정적 호스팅에 그대로 올릴 수 있다
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
