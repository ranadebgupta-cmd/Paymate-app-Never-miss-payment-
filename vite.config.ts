import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const cwd = (process as any).cwd ? (process as any).cwd() : '.';
  const env = loadEnv(mode, cwd, '');
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env': {}
    },
    // PDF.js uses top-level await, so we need target esnext
    build: {
      target: 'esnext',
      outDir: 'dist',
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext'
      }
    }
  };
});