import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite' // Import UnoCSS

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(), // Add UnoCSS plugin
  ],
  server: { // Add server configuration
    cors: true, // Enable CORS for all origins during development
    // You might need more specific CORS settings in a real-world scenario
    // For example:
    // cors: {
    //   origin: 'vscode-webview://*', // Allow only webview origins (might need adjustment)
    //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    //   credentials: true,
    // }
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
})
