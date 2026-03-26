import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom", "framer-motion", "lucide-react"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-tooltip", "embla-carousel-react"],
        },
      },
    },
  },
  server: {
    host: true,
  },
});
