import { runBenchmarks } from './benchmark';

// Define the message types
interface WorkerMessage {
  systemInfo: Record<string, unknown>;
  sizes?: number[];
  wavelets?: string[];
  targetDurationMs?: number;
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  try {
    const results = await runBenchmarks({
      systemInfo: e.data.systemInfo,
      sizes: e.data.sizes,
      wavelets: e.data.wavelets,
      targetDurationMs: e.data.targetDurationMs,
      pyodideIndexUrl: "https://cdn.jsdelivr.net/pyodide/v0.27.0/full",
      setProgress: (progress: string) => {
        self.postMessage({ type: 'progress', data: progress });
      },
      setCurrentTest: (test: string) => {
        self.postMessage({ type: 'currentTest', data: test });
      },
      setPercentComplete: (percent: number) => {
        self.postMessage({ type: 'percentComplete', data: percent });
      }
    });
    self.postMessage({ type: 'complete', data: results });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    self.postMessage({ type: 'error', data: errorMessage });
  }
};
