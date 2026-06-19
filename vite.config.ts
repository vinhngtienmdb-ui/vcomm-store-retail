import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Load local .env file
const envPath = path.resolve(import.meta.dirname, ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`[vite.config] Loaded env from ${envPath}`);
}

const rawPort = process.env.PORT ?? process.env.PORT_WEB ?? "5173";
const port = Number(rawPort);

const basePath = process.env.BASE_PATH ?? "/";
const host = process.env.HOST ?? "localhost";

const apiProxyTarget = process.env.API_PROXY_TARGET ?? "https://vcomm-storeretail.opencore.com.vn";
const localErpTarget = "http://localhost:3000";

const proxyConfig = {
  "/api/gemini": {
    target: localErpTarget,
    changeOrigin: true,
    secure: false,
    ws: true
  },
  "/api/inventory": {
    target: localErpTarget,
    changeOrigin: true,
    secure: false,
    ws: true
  },
  "/api": {
    target: apiProxyTarget,
    changeOrigin: true,
    secure: false,
    ws: true
  }
};

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "src/assets"),
      "@workspace/api-client-react": path.resolve(import.meta.dirname, "libs/api-client-react/src/index.ts"),
      "@workspace/object-storage-web": path.resolve(import.meta.dirname, "libs/object-storage-web/src/index.ts")
    },
    dedupe: ["react", "react-dom"]
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    port,
    strictPort: false,
    host,
    proxy: proxyConfig
  }
});