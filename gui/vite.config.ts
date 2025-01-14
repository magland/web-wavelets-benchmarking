import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/web-wavelets-benchmarking/",
  worker: {
    format: "es",
  },
});
