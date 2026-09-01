import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

async function localApiHandler(pathname) {
  if (pathname === "/api/health") return (await import("./api/health.js")).GET;
  if (pathname === "/api/phase-zero") return (await import("./api/phase-zero.js")).GET;
  if (/^\/api\/domains\/[^/]+$/.test(pathname)) return (await import("./api/domains/[name].js")).GET;
  return null;
}

function vercelFunctionsDevBridge() {
  return {
    name: "vercel-functions-dev-bridge",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.method !== "GET" || !request.url?.startsWith("/api/")) {
          next();
          return;
        }

        const requestUrl = new URL(request.url, "http://localhost");
        const handler = await localApiHandler(requestUrl.pathname);
        if (!handler) {
          next();
          return;
        }

        try {
          const result = await handler(new Request(requestUrl));
          response.statusCode = result.status;
          result.headers.forEach((value, key) => response.setHeader(key, value));
          response.end(Buffer.from(await result.arrayBuffer()));
        } catch (error) {
          server.config.logger.error(error instanceof Error ? error.stack || error.message : String(error));
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ error: "Local API request failed." }));
        }
      });
    },
  };
}

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [vercelFunctionsDevBridge(), react()],
});
