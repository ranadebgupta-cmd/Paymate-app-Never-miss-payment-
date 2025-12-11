import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // We cast process to any to avoid TypeScript errors if @types/node is missing
  const cwd = (process as any).cwd ? (process as any).cwd() : '.';
  const env = loadEnv(mode, cwd, '');
  
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env for the app code
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env': {}
    },
    build: {
      outDir: 'dist'
    }
  };
});