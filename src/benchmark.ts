/* eslint-disable @typescript-eslint/no-explicit-any */
import DiscreteWavelets from "discrete-wavelets";
import { loadPyodide } from "pyodide";
import { init, wavedec, Wavelet, waverec } from "wasmlets";
import { BenchmarkResult } from "./benchmarkTypes.js";

export async function runBenchmarks(o: {
  systemInfo: any;
  sizes?: number[];
  wavelets?: string[];
  targetDurationMs?: number;
  setProgress?: (progress: string) => void;
  setCurrentTest?: (test: string) => void;
  setPercentComplete?: (percent: number) => void;
  pyodideIndexUrl?: string;
}) {
  // Set defaults
  const sizes = o.sizes ?? [1e5, 1e6];
  const wavelets = o.wavelets ?? ["db2", "db4"];
  const targetDurationMs = o.targetDurationMs ?? 1000;
  const pyodideIndexUrl = o.pyodideIndexUrl ?? undefined;
  const { setProgress, setCurrentTest, setPercentComplete } = o;

  // Initialize both libraries
  setProgress?.("Initializing wasmlets...");
  const preWasmlets = performance.now();
  await init();
  const postWasmlets = performance.now();
  const wasmletsInitTime = postWasmlets - preWasmlets;
  console.log(`wasmlets initialized in ${wasmletsInitTime}ms`);

  console.log("Initializing Pyodide...");

  // all this does is heat up the cache, so we can measure the time it takes to load the packages
  // without internet speed affecting the results
  // note: had trouble getting this to work in the CI if I pass indexURL as a parameter, even if undefined!
  await loadPyodide().then((pyodide) =>
    pyodide.loadPackage(["numpy", "pywavelets"])
  );
  const prePyodide = performance.now();
  const pyodide = await loadPyodide({ packages: ["numpy", "pywavelets"] });
  const postPyodide = performance.now();
  const pyodideInitTime = postPyodide - prePyodide;
  console.log(`Pyodide and packages initialized in ${pyodideInitTime}ms`);

  setProgress?.("Running benchmarks...");

  const results = {
    timestamp: new Date().toISOString(),
    systemInfo: {
      ...o.systemInfo,
      wasmlets: "0.0.3",
      pyodide: pyodide.version,
      discreteWavelets: "5.0.1",
    },
    configuration: {
      wavelets,
      targetDurationMs,
    },
    initializationTimings: {
      wasmlets: wasmletsInitTime,
      pyodide: pyodideInitTime,
    },
    info: `Timings are in milliseconds. 'wavedec' and 'waverec' are the average times taken to run the respective functions over ${targetDurationMs}ms.`,
    benchmarks: [] as BenchmarkResult[],
  };

  const totalTests = wavelets.length * sizes.length;
  let completedTests = 0;

  for (const wavelet of wavelets) {
    for (const size of sizes) {
      setCurrentTest?.(`Testing wavelet ${wavelet} with size ${size}`);
      setPercentComplete?.(Math.round((completedTests / totalTests) * 100));
      // Generate test data
      const data = new Float64Array(size);
      for (let i = 0; i < size; i++) {
        data[i] = Math.sin(i / 10) + Math.random() * 0.1;
      }

      //////////////////////////////////////////////////////////////////////////
      // Wavedec benchmark
      console.info(
        `Running wasmlets benchmarks for size ${size} and wavelet ${wavelet}`
      );
      const startDec = performance.now();
      let numDecTrials = 0;
      let coeffs: any;
      while (performance.now() - startDec < targetDurationMs) {
        coeffs = wavedec(data, wavelet as Wavelet, "sym");
        numDecTrials++;
      }
      const endDec = performance.now();
      const wasmletsDecAvg = (endDec - startDec) / numDecTrials;
      console.info(`wavedec: ${wasmletsDecAvg}ms (${numDecTrials} trials)`);

      const startRec = performance.now();
      let numRecTrials = 0;
      let x: any;
      while (performance.now() - startRec < targetDurationMs) {
        x = waverec(coeffs, wavelet as Wavelet, data.length);
        numRecTrials++;
      }
      const endRec = performance.now();
      const wasmletsRecAvg = (endRec - startRec) / numRecTrials;
      console.info(`waverec: ${wasmletsRecAvg}ms (${numRecTrials} trials)`);
      console.info("");
      if (!arraysAreClose(data, x)) {
        throw new Error("Round trip failed");
      }

      //////////////////////////////////////////////////////////////////////////
      // Pywavelets benchmarks
      console.info(
        `Running pywavelets benchmarks for size ${size} and wavelet ${wavelet}`
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
    'pywaveletsDecAvg': wavedec_avg_time,
    'pywaveletsRecAvg': waverec_avg_time,
    'numDecTrials': num_dec_trials,
    'numRecTrials': num_rec_trials
})
        `);
      const {
        pywaveletsDecAvg,
        pywaveletsRecAvg,
        numDecTrials: pyNumDecTrials,
        numRecTrials: pyNumRecTrials,
      } = JSON.parse(pyodideResult);
      console.info(`wavedec: ${pywaveletsDecAvg}ms (${pyNumDecTrials} trials)`);
      console.info(`waverec: ${pywaveletsRecAvg}ms (${pyNumRecTrials} trials)`);
      console.info("");

      //////////////////////////////////////////////////////////////////////////
      // Pywavelets-with-marshalling benchmarks
      console.info(
        `Running pywavelets-with-marshalling benchmarks for size ${size} and wavelet ${wavelet}`
      );
      const startPywaveletsWithMarshallingDec = performance.now();
      let numPywaveletsWithMarshallingDecTrials = 0;
      let pywaveletsWithMarshallingCoeffs: any;
      while (
        performance.now() - startPywaveletsWithMarshallingDec <
        targetDurationMs
      ) {
        pywaveletsWithMarshallingCoeffs = await pywaveletsRoundTripDec(
          pyodide,
          data,
          wavelet
        );
        numPywaveletsWithMarshallingDecTrials++;
      }
      const endPywaveletsWithMarshallingDec = performance.now();
      const pywaveletsWithMarshallingDecAvg =
        (endPywaveletsWithMarshallingDec - startPywaveletsWithMarshallingDec) /
        numPywaveletsWithMarshallingDecTrials;
      console.info(
        `wavedec: ${pywaveletsWithMarshallingDecAvg}ms (${numPywaveletsWithMarshallingDecTrials} trials)`
      );

      const startPywaveletsWithMarshallingRec = performance.now();
      let numPywaveletsWithMarshallingRecTrials = 0;
      let pywaveletsWithMarshallingX: any;
      while (
        performance.now() - startPywaveletsWithMarshallingRec <
        targetDurationMs
      ) {
        pywaveletsWithMarshallingX = await pywaveletsRoundTripRec(
          pyodide,
          pywaveletsWithMarshallingCoeffs,
          wavelet
        );
        numPywaveletsWithMarshallingRecTrials++;
      }
      const endPywaveletsWithMarshallingRec = performance.now();
      const pywaveletsWithMarshallingRecAvg =
        (endPywaveletsWithMarshallingRec - startPywaveletsWithMarshallingRec) /
        numPywaveletsWithMarshallingRecTrials;
      console.info(
        `waverec: ${pywaveletsWithMarshallingRecAvg}ms (${numPywaveletsWithMarshallingRecTrials} trials)`
      );
      console.info("");
      if (!arraysAreClose(pywaveletsWithMarshallingX, x)) {
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        pywavelets: {
          timings: {
            wavedec: pywaveletsDecAvg,
            waverec: pywaveletsRecAvg,
          },
        },
        pywaveletsWithMarshalling: {
          timings: {
            wavedec: pywaveletsWithMarshallingDecAvg,
            waverec: pywaveletsWithMarshallingRecAvg,
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
      completedTests++;
      setPercentComplete?.(Math.round((completedTests / totalTests) * 100));
    }
  }

  return results;
}

const pywaveletsRoundTripDec = async (
  pyodide: any,
  data: Float64Array,
  wavelet: string
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
  wavelet: string
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
