import { createApp } from "./app.js";
import { loadBackendConfig } from "./config.js";

const config = loadBackendConfig();
const { app, configurationProblems } = createApp({ config });

if (configurationProblems.length) {
  console.error("Backend configuration blocked:\\n- " + configurationProblems.join("\\n- "));
  process.exitCode = 1;
} else {
  const server = app.listen(config.port, () => {
    console.log("domains.country API listening on port " + config.port);
  });
  process.on("SIGTERM", () => server.close(() => process.exit(0)));
}
