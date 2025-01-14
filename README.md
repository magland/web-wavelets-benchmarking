# Wasmlets vs Pyodide vs discrete-wavelets benchmark

This project benchmarks the performance of the [wasmlets](https://github.com/flatironinstitute/wasmlets) library (which uses [wavelib](https://github.com/rafat/wavelib)) against other alternatives for the 1-dimensional discrete wavelet transform in the browser.

You can either run the benchmark in node.js or in the browser.

## Node.js Instructions

```bash

Instructions

```bash
npm install
npm run benchmark
python plot_benchmark.py
# take a look at the output directory
```

Results are also pushed to the [benchmark-results](https://github.com/magland/web-wavelets-benchmarking/tree/benchmark-results) branch by a GitHub action. Here's a plot of the latest CI run:

<img alt="Latest results" src="https://raw.githubusercontent.com/magland/web-wavelets-benchmarking/refs/heads/benchmark-results/benchmark-results/benchmark.png" width=450 />

As noted below, discrete-wavelets (the pure JavaScript solution) is excluded from the plot due to significantly slower performance.

[Here is the table containing the latest results](https://github.com/magland/web-wavelets-benchmarking/blob/benchmark-results/benchmark-results/benchmark.md)

## Browser Instructions

Visit the [benchmark page](https://magland.github.io/web-wavelets-benchmarking/).

Or run in development mode:

```bash
cd gui
yarn install
yarn dev
```

## Notes

Compares the following 1-dimensional discrete wavelet transform implementations in both Node.js and the browser:
- wasmlets/wavelib (WebAssembly)
- PyWavelets (Pyodide)
- PyWavelets with marshalling (Pyodide)
- discrete-wavelets (JavaScript)

Tests both decomposition (wavedec) and reconstruction (waverec) operations using db2/db4 wavelets on arrays of size 100k and 1M elements. Each operation runs for 1000ms to get stable averages.

Results show relative performance between implementations, with discrete-wavelets excluded from plots due to significantly slower performance.

While compute times between wasmlets/wavelib and non-marshalling PyWavelets are similar, the PyWavelets implementation requires loading the resource-intensive pyodide environment, adding up to several seconds of initialization overhead.

For the PyWavelets/Pyodide implementation, two variants are tested:
- Regular PyWavelets: Data stays in Python's memory space between trials
- PyWavelets with marshalling: Data is explicitly marshalled (converted) between JavaScript and Python at each trial using Pyodide's to_py() and toJs() methods. This additional data conversion affects performance but may be necessary in scenarios where data needs to move between JavaScript and Python contexts as part of each wavelet operation.

The benchmark.ts file is maintained as identical copies in both src/benchmark.ts and gui/src/benchmark.ts. Rather than attempting to share a single file between the Node.js and browser environments (which would require complex build configuration due to different TypeScript environments), we maintain synchronization through two utility scripts:
- gui/devel/check_benchmark_files.sh: Verifies that the files are identical between src/ and gui/src/
- gui/devel/sync_benchmark_files.sh: Synchronizes the files by copying the most recently modified version
