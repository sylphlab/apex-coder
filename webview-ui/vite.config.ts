import { defineConfig, Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import UnoCSS from 'unocss/vite'; // Import UnoCSS
import fs from 'node:fs'; // Added fs import
import path from 'node:path'; // Added path import

// Custom plugin to write the actual server port to a file
const writePortPlugin = (): Plugin => {
  let serverPort: number | undefined;
  // Resolve path relative to vite.config.ts, going up one level to the workspace root
  const portFilePath = path.resolve(__dirname, '../.vite.port');

  return {
    name: 'write-port',
    configureServer(server) {
      // Use the 'listening' event which fires after the server is actually listening
      server.httpServer?.on('listening', () => {
        const address = server.httpServer?.address();
        // Check if address is an object and has a port property
        if (address && typeof address === 'object' && address.port) {
          serverPort = address.port; // Get the actual port
          // Vite dev server is listening on port
          try {
            // Write the port number to the file
            fs.writeFileSync(portFilePath, String(serverPort));
            // Port successfully written to file
          } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
            // Error writing port file
          }
        } else {
          // Could not determine server port
        }
      });
    },
    // Optional: Cleanup the port file when the dev server is closed
    closeBundle() {
      if (fs.existsSync(portFilePath)) {
        try {
          fs.unlinkSync(portFilePath);
          // Removed port file
        } catch (error) { // eslint-disable-line @typescript-eslint/no-unused-vars
          // Error removing port file
        }
      }
    },
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(), // Add UnoCSS plugin
    writePortPlugin(), // Add our custom plugin here
  ],
  server: {
    cors: true, // Enable CORS for all origins during development
    host: '127.0.0.1', // Explicitly set the host
    strictPort: false, // Allow Vite to try other ports if the default is taken
  },
  build: {
    outDir: 'dist', // Ensure output directory is 'dist'
    rollupOptions: {
      output: {
        // Disable hash in filenames
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
});
