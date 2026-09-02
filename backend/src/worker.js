import { createDatabase } from "./db.js";
import { loadBackendConfig } from "./config.js";
import { createWorkers } from "./workers.js";

const config = loadBackendConfig();
const db = createDatabase(config.databaseUrl);
const workers = createWorkers({ config, db });

try {
  const result = await workers.runOnce();
  console.log(JSON.stringify(result));
  process.exitCode = result.ok ? 0 : 1;
} finally {
  await db.close();
}
