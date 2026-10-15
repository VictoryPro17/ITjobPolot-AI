import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Der Dev-Proxy leitet /api an die ASP.NET Core API weiter. Dadurch laufen
// Frontend und API im Browser unter derselben Origin, was die Cookie-basierte
// Authentifizierung ohne SameSite-Sonderregeln funktionieren laesst.
const apiTarget = process.env.VITE_API_PROXY_TARGET ?? "http://localhost:5042";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // Grosse, selten geaenderte Bibliotheken in eigene Dateien, damit der Browser
        // sie zwischen Deployments weiter aus dem Cache nutzen kann.
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
            { name: "query", test: /node_modules[\\/]@tanstack[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: false,
        secure: false,
      },
    },
  },
});