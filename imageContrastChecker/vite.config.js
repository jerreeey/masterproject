import { defineConfig } from "vite";

export default defineConfig({
  build: {
    assetsDir: ".",
    outDir: "dist",
    rollupOptions: {
      input: "scripts/main.js",
      output: {
        entryFileNames: "main.js",
      },
    },
  },
});
