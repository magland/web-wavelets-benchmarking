import * as fs from "fs/promises";
import * as path from "path";
import os from "os";
import { runBenchmarks } from "./benchmark.js";

async function main() {
  const systemInfo = {
    hostname: os.hostname(),
    os: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
  };
  const results = await runBenchmarks({
    systemInfo,
  });

  // Save results
  const resultsJson = JSON.stringify(results, null, 2);
  console.log("\nResults:");
  console.log(resultsJson);

  // Save results
  const outputDir = "output";
  await fs.mkdir(outputDir, { recursive: true });
  const mainOutputPath = path.join(outputDir, "benchmark.json");
  await fs.writeFile(mainOutputPath, resultsJson);
  console.log(`\nResults saved to ${mainOutputPath}`);

  // If running in GitHub Actions, save archived copy
  if (process.env.GITHUB_ACTIONS) {
    const archiveDir = path.join("benchmark-results", "archive");
    await fs.mkdir(archiveDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const archivePath = path.join(archiveDir, `benchmark-${timestamp}.json`);
    await fs.writeFile(archivePath, resultsJson);
    console.log(`Archived copy saved to ${archivePath}`);
  }
}

// Run benchmarks
main().catch(console.error);
