import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // On garde ton port d'origine pour le frontend
    proxy: {
      "/api": {
        target: "http://localhost:5000", // Redirige les requêtes /api vers ton serveur Express
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
