import { defineConfig, Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import UnoCSS from 'unocss/vite'; // Import UnoCSS
import fs from 'fs'; // Added fs import
import path from 'path'; // Added path import

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
           console.log(`[write-port-plugin] Vite dev server is listening on port: ${serverPort}`);
           try {
               // Write the port number to the file
               fs.writeFileSync(portFilePath, String(serverPort));
               console.log(`[write-port-plugin] Port ${serverPort} successfully written to ${portFilePath}`);
           } catch (err) {
               console.error(`[write-port-plugin] Error writing port file: ${err}`);
           }
        } else {
             console.error(`[write-port-plugin] Could not determine server port.`);
        }
      });
    },
     // Optional: Cleanup the port file when the dev server is closed
     closeBundle() {
        if (fs.existsSync(portFilePath)) {
            try {
                fs.unlinkSync(portFilePath);
                console.log(`[write-port-plugin] Removed port file: ${portFilePath}`);
            } catch (err) {
                console.error(`[write-port-plugin] Error removing port file: ${err}`);
            }
        }
    }
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
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
});
