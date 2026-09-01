import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

if (!process.env.BRAND_QA_NODE_MODULES) {
  throw new Error("Set BRAND_QA_NODE_MODULES to the bundled Node dependency directory.");
}

const require = createRequire(path.join(process.env.BRAND_QA_NODE_MODULES, "package.json"));
const sharp = require("sharp");

const sourceDir = path.resolve("output/brand/domains-country-identity-pack/svg");
const outputDir = path.resolve("tmp/brand-svg-qa");

await fs.mkdir(outputDir, { recursive: true });
const files = (await fs.readdir(sourceDir)).filter((name) => name.endsWith(".svg")).sort();

for (const file of files) {
  const input = path.join(sourceDir, file);
  const output = path.join(outputDir, file.replace(/\.svg$/, ".png"));
  await sharp(input, { density: 144 }).png().toFile(output);
}

console.log(`Rendered ${files.length} SVG files to ${outputDir}`);
