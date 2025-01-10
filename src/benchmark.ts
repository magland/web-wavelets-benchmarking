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
  const pyodide = await loadPyodide({ packages: ["numpy", "pywavelets"] });
  const postPyodide = performance.now();
  console.log(
    `Pyodide and packages initialized in ${postPyodide - prePyodide}ms`
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
    pywaveletsWithinPython: {
      timings: {
        wavedec: number;
        waverec: number;
      };
    };
    pywavelets: {
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

      //////////////////////////////////////////////////////////////////////////
      // Wasmlets benchmark
      console.info(
        `Running wasmlets benchmarks for size ${size} and wavelet ${wavelet}`
      );
      const startDec = performance.now();
      let numDecTrials = 0;
      let coeffs: any;
      while (performance.now() - startDec < targetDurationMs) {
        coeffs = wavedec(data, wavelet, "sym");
        numDecTrials++;
      }
      const endDec = performance.now();
      const wasmletsDecAvg = (endDec - startDec) / numDecTrials;
      console.info(`wavedec: ${wasmletsDecAvg}ms (${numDecTrials} trials)`);

      const startRec = performance.now();
      let numRecTrials = 0;
      let x: any;
      while (performance.now() - startRec < targetDurationMs) {
        x = waverec(coeffs, wavelet, data.length);
        numRecTrials++;
      }
      const endRec = performance.now();
      const wasmletsRecAvg = (endRec - startRec) / numRecTrials;
      console.info(`wavedec: ${wasmletsDecAvg}ms (${numDecTrials} trials)`);
      console.info("");
      if (!arraysAreClose(data, x)) {
        throw new Error("Round trip failed");
      }

      //////////////////////////////////////////////////////////////////////////
      // Pywavelets-within-python benchmarks
      console.info(
        `Running pywavelets-within-python benchmarks for size ${size} and wavelet ${wavelet}`
      );

      pyodide.globals.set("input_data", data);

      const pyodideResult = await pyodide.runPythonAsync(`
import numpy as np
import pywt
import time
import json

# Convert the transferred array to numpy array
data = np.array(input_data.to_py())

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
    'pywaveletsWithinPythonDecAvg': wavedec_avg_time,
    'pywaveletsWithinPythonRecAvg': waverec_avg_time,
    'numDecTrials': num_dec_trials,
    'numRecTrials': num_rec_trials
})
        `);
      const {
        pywaveletsWithinPythonDecAvg,
        pywaveletsWithinPythonRecAvg,
        numDecTrials: pyNumDecTrials,
        numRecTrials: pyNumRecTrials,
      } = JSON.parse(pyodideResult);
      console.info(
        `wavedec: ${pywaveletsWithinPythonDecAvg}ms (${pyNumDecTrials} trials)`
      );
      console.info(
        `waverec: ${pywaveletsWithinPythonRecAvg}ms (${pyNumRecTrials} trials)`
      );
      console.info("");

      //////////////////////////////////////////////////////////////////////////
      // Pywavelets benchmarks
      console.info(
        `Running pywavelets benchmarks for size ${size} and wavelet ${wavelet}`
      );
      const startPywaveletsDec = performance.now();
      let numPywaveletsDecTrials = 0;
      let pywaveletsCoeffs: any;
      while (performance.now() - startPywaveletsDec < targetDurationMs) {
        pywaveletsCoeffs = await pywaveletsRoundTripDec(pyodide, data, wavelet);
        numPywaveletsDecTrials++;
      }
      const endPywaveletsDec = performance.now();
      const pywaveletsDecAvg =
        (endPywaveletsDec - startPywaveletsDec) / numPywaveletsDecTrials;
      console.info(
        `wavedec: ${pywaveletsDecAvg}ms (${numPywaveletsDecTrials} trials)`
      );

      const startPywaveletsRec = performance.now();
      let numPywaveletsRecTrials = 0;
      let pywaveletsX: any;
      while (performance.now() - startPywaveletsRec < targetDurationMs) {
        pywaveletsX = await pywaveletsRoundTripRec(
          pyodide,
          pywaveletsCoeffs,
          wavelet
        );
        numPywaveletsRecTrials++;
      }
      const endPywaveletsRec = performance.now();
      const pywaveletsRecAvg =
        (endPywaveletsRec - startPywaveletsRec) / numPywaveletsRecTrials;
      console.info(
        `waverec: ${pywaveletsRecAvg}ms (${numPywaveletsRecTrials} trials)`
      );
      console.info("");
      if (!arraysAreClose(pywaveletsX, x)) {
        throw new Error("Round trip failed");
      }

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
      console.info(
        `wavedec: ${discreteDecAvg}ms (${numDiscreteDecTrials} trials)`
      );

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
        */
      const numDiscreteRecTrials = 0;
      const discreteRecAvg = undefined;
      console.info(
        `waverec: ${discreteRecAvg} ms (${numDiscreteRecTrials} trials)`
      );
      console.info("");

      const wasmletResult: BenchmarkResult = {
        size,
        wavelet,
        wasmlets: {
          timings: {
            wavedec: wasmletsDecAvg,
            waverec: wasmletsRecAvg,
          },
        },
        pywaveletsWithinPython: {
          timings: {
            wavedec: pywaveletsWithinPythonDecAvg,
            waverec: pywaveletsWithinPythonRecAvg,
          },
        },
        pywavelets: {
          timings: {
            wavedec: pywaveletsDecAvg,
            waverec: pywaveletsRecAvg,
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

const pywaveletsRoundTripDec = async (
  pyodide: any,
  data: Float64Array,
  wavelet: Wavelet
) => {
  pyodide.globals.set("input_data", data);

  const pyodideResult = await pyodide.runPythonAsync(`
import numpy as np
import pywt

data = np.array(input_data.to_py())

coeffs = pywt.wavedec(data, '${wavelet}')
coeffs
        `);
  const coeffs = pyodideResult.toJs();
  pyodideResult.destroy();
  return coeffs;
};

const pywaveletsRoundTripRec = async (
  pyodide: any,
  coeffs: any,
  wavelet: Wavelet
) => {
  pyodide.globals.set("input_coeffs", coeffs);

  const pyodideResult = await pyodide.runPythonAsync(`
import numpy as np
import pywt
import pyodide

coeffs = [np.array(c) for c in input_coeffs.to_py()]

x = pywt.waverec(coeffs, '${wavelet}')
x
        `);
  const reconstruct = pyodideResult.toJs();
  pyodideResult.destroy();
  return reconstruct;
};

const arraysAreClose = (a: Float64Array, b: Float64Array) => {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > 1e-6) {
      return false;
    }
  }

  return true;
};

// Run benchmarks
runBenchmarks().catch(console.error);
