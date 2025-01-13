import * as fs from "fs/promises";
import * as path from "path";
import os from "os";
import { runBenchmarks } from "./benchmark.js";
import { BenchmarkResult } from "./benchmarkTypes.js";

function formatMarkdownTable(results: BenchmarkResult[]) {
  // Headers
  let md = '| Size | Wavelet | Wasmlets (dec/rec) | PyWavelets (dec/rec) | PyWavelets+Marshal (dec/rec) | DiscreteWavelets (dec/rec) |\n';
  md += '|------|---------|-------------------|-------------------|--------------------------|------------------------|\n';

  // Sort results by size then wavelet
  const sortedResults = [...results].sort((a, b) => {
    if (a.size !== b.size) return a.size - b.size;
    return a.wavelet.localeCompare(b.wavelet);
  });

  // Format each row
  for (const result of sortedResults) {
    const formatTiming = (dec?: number, rec?: number) => {
      if (dec === undefined) return 'N/A';
      const decStr = dec.toFixed(2);
      const recStr = rec === undefined ? 'N/A' : rec.toFixed(2);
      return `${decStr}/${recStr}`;
    };

    md += `| ${result.size} | ${result.wavelet} | `;
    md += `${formatTiming(result.wasmlets.timings.wavedec, result.wasmlets.timings.waverec)} | `;
    md += `${formatTiming(result.pywavelets.timings.wavedec, result.pywavelets.timings.waverec)} | `;
    md += `${formatTiming(result.pywaveletsWithMarshalling.timings.wavedec, result.pywaveletsWithMarshalling.timings.waverec)} | `;
    md += `${formatTiming(result.discreteWavelets.timings.wavedec, result.discreteWavelets.timings.waverec)} |\n`;
  }

  return md;
}


async function main() {
  const systemInfo = {
    hostname: os.hostname(),
    os: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
  };
  const results = await runBenchmarks({
    systemInfo,
    pyodideIndexUrl: undefined
  });

  // Save results
  const resultsJson = JSON.stringify(results, null, 2);
  console.log("\nResults:");
  console.log(resultsJson);

  // Save results
  const outputDir = "output";
  await fs.mkdir(outputDir, { recursive: true });

  // Save JSON
  const mainOutputPath = path.join(outputDir, "benchmark.json");
  await fs.writeFile(mainOutputPath, resultsJson);
  console.log(`\nResults saved to ${mainOutputPath}`);

  // Save markdown table
  const markdownTable = formatMarkdownTable(results.benchmarks);
  const markdownPath = path.join(outputDir, "benchmark.md");
  await fs.writeFile(markdownPath, markdownTable);
  console.log(`Markdown table saved to ${markdownPath}`);

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
