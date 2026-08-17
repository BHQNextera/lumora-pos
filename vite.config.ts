import {
  defineConfig,
} from "vite";

import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
  ],

  clearScreen: false,

  server: {
    port: 5173,
    strictPort: true,

    watch: {
      /*
       * Rust/Tauri build output lives below src-tauri.
       * Vite must not watch it or Windows may report
       * EBUSY while Cargo is compiling executables.
       */
      ignored: [
        "**/src-tauri/**",
      ],
    },
  },
});