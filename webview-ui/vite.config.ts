import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import UnoCSS from 'unocss/vite'; // Import UnoCSS

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(), // Add UnoCSS plugin
  ],
  server: {
    cors: true, // Enable CORS for all origins during development
    host: '127.0.0.1', // Explicitly set the host
    port: 5173, // Explicitly set the port
  },
  build: {
    outDir: 'dist', // Ensure output directory is 'dist'
    rollupOptions: {
      output: {
        // Disable hash in filenames
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
});
