import { useState } from 'react';

export interface BenchmarkConfigProps {
  onStartBenchmark: (config: BenchmarkSettings) => void;
}

export interface BenchmarkSettings {
  sizes: number[];
  wavelets: string[];
  targetDurationMs: number;
}

export function BenchmarkConfig({ onStartBenchmark }: BenchmarkConfigProps) {
  const [sizes, setSizes] = useState<string>('100000, 1000000');
  const [wavelets, setWavelets] = useState<string>('db2, db4');
  const [targetDurationMs, setTargetDurationMs] = useState<string>('1000');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartBenchmark({
      sizes: sizes.split(',').map(s => parseInt(s.trim())),
      wavelets: wavelets.split(',').map(w => w.trim()),
      targetDurationMs: parseInt(targetDurationMs)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-100 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Data Sizes (comma separated)
          <input
            type="text"
            value={sizes}
            onChange={(e) => setSizes(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Wavelets (comma separated)
          <input
            type="text"
            value={wavelets}
            onChange={(e) => setWavelets(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Target Duration (ms)
          <input
            type="number"
            value={targetDurationMs}
            onChange={(e) => setTargetDurationMs(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </label>
      </div>
      <button
        type="submit"
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Start Benchmark
      </button>
    </form>
  );
}
