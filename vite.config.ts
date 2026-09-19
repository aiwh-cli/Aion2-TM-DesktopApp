import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ root: 'web', plugins: [react()], build: { outDir: 'dist', emptyOutDir: true }, test: { environment: 'node' } } as Parameters<typeof defineConfig>[0]);
