import path from "path";
import fs from "fs";

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import UnoCSS from 'unocss/vite';
// import type { PluginOption } from 'vite'; // Revert type import

// Custom plugin to write the server port to a file
const writePortToFile = () => {
	return {
		name: "write-port-to-file",
		configureServer(server: { httpServer: { once: (arg0: string, arg1: () => void) => void; address: () => any; }; }) {
			// Write the port to a file when the server starts
			server.httpServer?.once("listening", () => {
				const address = server.httpServer.address();
				const port = typeof address === "object" && address ? address.port : null;

				if (port) {
					// Write to a file in the project root
					const portFilePath = path.resolve(__dirname, "../.vite-port");
					fs.writeFileSync(portFilePath, port.toString());
					console.log(`[Vite Plugin] Server started on port ${port}`);
					console.log(`[Vite Plugin] Port information written to ${portFilePath}`);
				} else {
					console.warn("[Vite Plugin] Could not determine server port");
				}
			});
		},
	};
};

export default defineConfig({
  plugins: [
    react(),
    UnoCSS(),
    writePortToFile()
    // Ensure writePortToFile() is not called here
  ],
	server: {
		hmr: {
			host: "localhost",
			protocol: "ws",
		},
		cors: {
			origin: "*",
			methods: "*",
			allowedHeaders: "*",
		},
	},
  build: {
    outDir: 'dist',
		reportCompressedSize: false,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
});
