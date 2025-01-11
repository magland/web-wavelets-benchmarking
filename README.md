# Wasmlets vs Pyodide vs discrete-wavelets benchmark

This project benchmarks the performance of the [wasmlets](https://github.com/flatironinstitute/wasmlets) library against other alternatives for the 1-dimensional discrete wavelet transform in the browser.

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

<img alt="Latest results" src="https://raw.githubusercontent.com/magland/wasmlets-benchmark/refs/heads/benchmark-results/benchmark-results/benchmark.png" width=450 />

Results are also pushed to the [benchmark-results](https://github.com/magland/wasmlets-benchmark/tree/benchmark-results) branch by a GitHub action.

## Browser Instructions

Visit the [benchmark page](https://magland.github.io/wasmlets-benchmark/).

Or run in development mode:

```bash
cd gui
yarn install
yarn dev
```

## Notes

Compares three wavelet transform implementations:
- wasmlets (WebAssembly)
- PyWavelets (via Pyodide)
- discrete-wavelets (JavaScript)

Tests both decomposition (wavedec) and reconstruction (waverec) operations using db2/db4 wavelets on arrays of size 100k and 1M elements. Each operation runs for 1000ms to get stable averages.

Results show relative performance between implementations, with discrete-wavelets excluded from plots due to significantly slower performance. Note that discrete-wavelets reconstruction is disabled due to performance issues.
