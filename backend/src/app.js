import express from "express";
import { corsMiddleware } from "./cors.js";
import { createDatabase } from "./db.js";
import { backendConfigurationProblems, loadBackendConfig } from "./config.js";
import { registerRoutes } from "./routes.js";
import { createWorkers } from "./workers.js";

function parseCookies(request, _response, next) {
  const header = request.get("cookie") || "";
  request.cookies = Object.fromEntries(header.split(";").map((item) => {
    const index = item.indexOf("=");
    return index < 0 ? [] : [item.slice(0, index).trim(), decodeURIComponent(item.slice(index + 1).trim())];
  }).filter(([key]) => key));
  next();
}

export function createApp({ config = loadBackendConfig(), db = createDatabase(config.databaseUrl) } = {}) {
  const app = express();
  const workers = createWorkers({ config, db });

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(corsMiddleware(config.corsAllowedOrigins));
  app.use(express.json({ limit: "64kb" }));
  app.use(parseCookies);
  app.use((_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });

  registerRoutes(app, { config, db, workers });

  app.use((_request, response) => response.status(404).json({ error: "Not found." }));
  app.use((error, _request, response, _next) => {
    const status = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
    response.status(status).json({ error: error instanceof Error ? error.message : "Internal server error." });
  });

  return { app, db, workers, configurationProblems: backendConfigurationProblems(config) };
}
