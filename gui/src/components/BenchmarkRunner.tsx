import { useEffect, useState, useRef } from 'react';
import { BenchmarkSettings } from './BenchmarkConfig';
import { BenchmarkResult } from '../benchmarkTypes';

export type { BenchmarkResult };

type WorkerMessageData =
  | { type: 'progress'; data: string }
  | { type: 'currentTest'; data: string }
  | { type: 'percentComplete'; data: number }
  | { type: 'complete'; data: { benchmarks: BenchmarkResult[] } }
  | { type: 'error'; data: string };

// Need to use ?worker to tell Vite this is a web worker
const createWorker = () => new Worker(
  new URL('../benchmarkWorker.ts', import.meta.url),
  { type: 'module' }
);

interface BenchmarkRunnerProps {
  config: BenchmarkSettings;
  onComplete: (results: BenchmarkResult[]) => void;
}

export function BenchmarkRunner({ config, onComplete }: BenchmarkRunnerProps) {
  const [progress, setProgress] = useState<string>('Initializing...');
  const [currentTest, setCurrentTest] = useState<string>('');
  const [percentComplete, setPercentComplete] = useState(0);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = createWorker();
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerMessageData>) => {
      const { type, data } = e.data;
      switch (type) {
        case 'progress':
          setProgress(data as string);
          break;
        case 'currentTest':
          setCurrentTest(data as string);
          break;
        case 'percentComplete':
          setPercentComplete(data as number);
          break;
        case 'complete': {
          onComplete((data as { benchmarks: BenchmarkResult[] }).benchmarks);
          break;
        }
        case 'error':
          console.error('Benchmark error:', data);
          setProgress(data as string);
          break;
      }
    };

    worker.postMessage({
      systemInfo: {},
      sizes: config.sizes,
      wavelets: config.wavelets
    });

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [config, onComplete]);

  return (
    <div className="space-y-4 p-4 bg-gray-100 rounded-lg">
      <div className="text-lg font-medium">{progress}</div>
      <div className="text-sm text-gray-600">{currentTest}</div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full"
          style={{ width: `${percentComplete}%` }}
        ></div>
      </div>
    </div>
  );
}
