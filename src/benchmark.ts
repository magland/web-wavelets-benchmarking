import { init, wavedec, waverec, type Wavelet } from "wasmlets";
import { loadPyodide } from "pyodide";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import DiscreteWavelets from "discrete-wavelets";

async function runBenchmarks() {
  // Initialize both libraries
  console.log("Initializing wasmlets...");
  const preWasmlets = performance.now();
  await init();
  const postWasmlets = performance.now();
  console.log(`wasmlets initialized in ${postWasmlets - preWasmlets}ms`);

  console.log("Initializing Pyodide...");
  // all this does is heat up the cache, so we can measure the time it takes to load the packages
  // without internet speed affecting the results
  await loadPyodide().then((pyodide) =>
    pyodide.loadPackage(["numpy", "pywavelets"])
  );

  const prePyodide = performance.now();
  const pyodide = await loadPyodide();
  const postPyodide = performance.now();
  await pyodide.loadPackage(["numpy", "pywavelets"], {messageCallback: () => {}});
  const postPyodidePackage = performance.now();
  console.log(`Pyodide initialized in ${postPyodide - prePyodide}ms`);
  console.log(
    `Pyodide packages loaded in ${postPyodidePackage - postPyodide}ms`
  );

  // Benchmark parameters
  const sizes = [1e5, 1e6];
  const wavelets: Wavelet[] = ["db2", "db4"];
  const targetDurationMs = 1000; // Run each benchmark for ~3 seconds

  console.log("Running benchmarks...");
  interface BenchmarkResult {
    size: number;
    wavelet: Wavelet;
    wasmlets: {
      timings: {
        wavedec: number;
        waverec: number;
      };
    };
    pyodide: {
      timings: {
        wavedec: number;
        waverec: number;
      };
    };
    discreteWavelets: {
      timings: {
        wavedec: number;
        waverec?: number;
      };
    };
  }

  const results = {
    timestamp: new Date().toISOString(),
    systemInfo: {
      hostname: os.hostname(),
      os: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      wasmlets: "0.0.3",
      pyodide: pyodide.version,
      discreteWavelets: "5.0.1",
    },
    configuration: {
      wavelets,
      targetDurationMs,
    },
    info: `Timings are in milliseconds. 'wavedec' and 'waverec' are the average times taken to run the respective functions over ${targetDurationMs}ms.`,
    benchmarks: [] as BenchmarkResult[],
  };

  for (const wavelet of wavelets) {
    for (const size of sizes) {
      // Generate test data
      const data = new Float64Array(size);
      for (let i = 0; i < size; i++) {
        data[i] = Math.sin(i / 10) + Math.random() * 0.1;
      }

      console.info(
        `Running wasmlets benchmarks for size ${size} and wavelet ${wavelet}`
      );
      //////////////////////////////////////////////////////////////////////////
      // Wavedec benchmark
      const startDec = performance.now();
      let numDecTrials = 0;
      let coeffs: any;
      while (performance.now() - startDec < targetDurationMs) {
        coeffs = wavedec(data, wavelet, "sym");
        numDecTrials++;
      }
      const endDec = performance.now();
      const wasmletsDecAvg = (endDec - startDec) / numDecTrials;

      const startRec = performance.now();
      let numRecTrials = 0;
      let x;
      while (performance.now() - startRec < targetDurationMs) {
        x = waverec(coeffs, wavelet, data.length);
        numRecTrials++;
      }
      const endRec = performance.now();
      const wasmletsRecAvg = (endRec - startRec) / numRecTrials;
      console.info(
        `wavedec avg time: ${wasmletsDecAvg}ms (${numDecTrials} trials)`
      );

      //////////////////////////////////////////////////////////////////////////
      // Pyodide benchmarks
      console.info(
        `Running Pyodide benchmarks for size ${size} and wavelet ${wavelet}`
      );

      // Transfer the data array directly to Python
      pyodide.globals.set("input_data", data);

      const pyodideResult = await pyodide.runPythonAsync(`
import numpy as np
import pywt
import time
import json

# Convert the transferred array to numpy array
data = np.array(input_data)
target_duration = ${targetDurationMs / 1000}  # Convert to seconds

# Wavedec benchmark
start = time.time()
num_dec_trials = 0
while time.time() - start < target_duration:
    coeffs = pywt.wavedec(data, '${wavelet}')
    num_dec_trials += 1
end = time.time()
wavedec_time_elapsed = (end - start) * 1000
wavedec_avg_time = wavedec_time_elapsed / num_dec_trials

# Waverec benchmark
start = time.time()
num_rec_trials = 0
while time.time() - start < target_duration:
    x = pywt.waverec(coeffs, '${wavelet}')
    num_rec_trials += 1
end = time.time()
waverec_time_elapsed = (end - start) * 1000
waverec_avg_time = waverec_time_elapsed / num_rec_trials

json.dumps({
    'pyodideDecAvg': wavedec_avg_time,
    'pyodideRecAvg': waverec_avg_time,
    'numDecTrials': num_dec_trials,
    'numRecTrials': num_rec_trials
})
        `);
      const {
        pyodideDecAvg,
        pyodideRecAvg,
        numDecTrials: pyNumDecTrials,
        numRecTrials: pyNumRecTrials,
      } = JSON.parse(pyodideResult);
      console.info(
        `wavedec avg time: ${pyodideDecAvg}ms (${pyNumDecTrials} trials)`
      );
      console.info(
        `waverec avg time: ${pyodideRecAvg}ms (${pyNumRecTrials} trials)`
      );

      //////////////////////////////////////////////////////////////////////////
      // Discrete Wavelets benchmarks
      console.info(
        `Running discrete-wavelets benchmarks for size ${size} and wavelet ${wavelet}`
      );

      // Convert Float64Array to regular array for discrete-wavelets
      const regularArray = Array.from(data);

      const startDiscreteDec = performance.now();
      let numDiscreteDecTrials = 0;
      let discreteCoeffs: any;
      while (performance.now() - startDiscreteDec < targetDurationMs) {
        discreteCoeffs = (DiscreteWavelets as any).wavedec(
          regularArray,
          wavelet as any,
          "symmetric"
        );
        numDiscreteDecTrials++;
      }
      const endDiscreteDec = performance.now();
      const discreteDecAvg =
        (endDiscreteDec - startDiscreteDec) / numDiscreteDecTrials;

      // For some reason, discrete-wavelets waverec seems to hang
      // so disabling it
      /*
        const startDiscreteRec = performance.now();
        let numDiscreteRecTrials = 0;
        let discreteX;
        while (performance.now() - startDiscreteRec < targetDurationMs) {
            discreteX = (DiscreteWavelets as any).waverec(discreteCoeffs, wavelet as any);
            numDiscreteRecTrials++;
        }
        const endDiscreteRec = performance.now();
        const discreteRecAvg = (endDiscreteRec - startDiscreteRec) / numDiscreteRecTrials;
        console.info(`wavedec avg time: ${discreteDecAvg}ms (${numDiscreteDecTrials} trials)`);
        console.info(`waverec avg time: ${discreteRecAvg}ms (${numDiscreteRecTrials} trials)`);
        */
      const discreteRecAvg = undefined;

      const wasmletResult: BenchmarkResult = {
        size,
        wavelet,
        wasmlets: {
          timings: {
            wavedec: wasmletsDecAvg,
            waverec: wasmletsRecAvg,
          },
        },
        pyodide: {
          timings: {
            wavedec: pyodideDecAvg,
            waverec: pyodideRecAvg,
          },
        },
        discreteWavelets: {
          timings: {
            wavedec: discreteDecAvg,
            waverec: discreteRecAvg,
          },
        },
      };

      results.benchmarks.push(wasmletResult);
    }
  }

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
runBenchmarks().catch(console.error);
