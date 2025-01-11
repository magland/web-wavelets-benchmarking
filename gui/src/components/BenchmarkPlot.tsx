import Plot from 'react-plotly.js';
import { BenchmarkResult } from '../benchmarkTypes';
import { Data } from 'plotly.js';

interface BenchmarkPlotProps {
  results: BenchmarkResult[];
}

export function BenchmarkPlot({ results }: BenchmarkPlotProps) {
  if (!results.length) return null;

  // Extract unique sizes and wavelets (excluding discrete-wavelets)
  const sizes = [...new Set(results.map(b => b.size))].sort((a, b) => a - b);
  const wavelets = [...new Set(results.map(b => b.wavelet))].sort();

  // Create subplot data for each size
  const data: Data[] = [];
  const annotations: {
    text: string;
    xref: 'paper';
    yref: 'paper';
    x: number;
    y: number;
    showarrow: boolean;
    font: { size: number };
  }[] = [];

  sizes.forEach((size, sizeIndex) => {
    const sizeData = results.filter(b => b.size === size);

    // Extract timing data for this size
    const wasmletsDec = wavelets.map(w =>
      sizeData.find(b => b.wavelet === w)?.wasmlets.timings.wavedec || 0
    );
    const wasmletsRec = wavelets.map(w =>
      sizeData.find(b => b.wavelet === w)?.wasmlets.timings.waverec || 0
    );
    const pywaveletsDecDec = wavelets.map(w =>
      sizeData.find(b => b.wavelet === w)?.pywavelets.timings.wavedec || 0
    );
    const pywaveletsRec = wavelets.map(w =>
      sizeData.find(b => b.wavelet === w)?.pywavelets.timings.waverec || 0
    );
    const pywaveletsWithMarshallingDec = wavelets.map(w =>
      sizeData.find(b => b.wavelet === w)?.pywaveletsWithMarshalling.timings.wavedec || 0
    );
    const pywaveletsWithMarshallingRec = wavelets.map(w =>
      sizeData.find(b => b.wavelet === w)?.pywaveletsWithMarshalling.timings.waverec || 0
    );

    // Add bars for each implementation
    data.push(
      {
        name: 'Wasmlets Decomposition',
        x: wavelets,
        y: wasmletsDec,
        type: 'bar',
        marker: { color: 'skyblue' },
        xaxis: `x${sizeIndex + 1}`,
        yaxis: `y${sizeIndex + 1}`,
        showlegend: sizeIndex === 0,
      },
      {
        name: 'Wasmlets Reconstruction',
        x: wavelets,
        y: wasmletsRec,
        type: 'bar',
        marker: { color: 'lightblue' },
        xaxis: `x${sizeIndex + 1}`,
        yaxis: `y${sizeIndex + 1}`,
        showlegend: sizeIndex === 0,
      },
      {
        name: 'Pywavelets Decomposition',
        x: wavelets,
        y: pywaveletsDecDec,
        type: 'bar',
        marker: { color: 'orange' },
        xaxis: `x${sizeIndex + 1}`,
        yaxis: `y${sizeIndex + 1}`,
        showlegend: sizeIndex === 0,
      },
      {
        name: 'Pywavelets Reconstruction',
        x: wavelets,
        y: pywaveletsRec,
        type: 'bar',
        marker: { color: 'wheat' },
        xaxis: `x${sizeIndex + 1}`,
        yaxis: `y${sizeIndex + 1}`,
        showlegend: sizeIndex === 0,
      },
      {
        name: 'Pywavelets With Marshalling Decomposition',
        x: wavelets,
        y: pywaveletsWithMarshallingDec,
        type: 'bar',
        marker: { color: 'red' },
        xaxis: `x${sizeIndex + 1}`,
        yaxis: `y${sizeIndex + 1}`,
        showlegend: sizeIndex === 0,
      },
      {
        name: 'Pywavelets With Marshalling Reconstruction',
        x: wavelets,
        y: pywaveletsWithMarshallingRec,
        type: 'bar',
        marker: { color: 'pink' },
        xaxis: `x${sizeIndex + 1}`,
        yaxis: `y${sizeIndex + 1}`,
        showlegend: sizeIndex === 0,
      }
    );

    // Add title annotation for each subplot
    annotations.push({
      text: `Array Size: ${size.toLocaleString()}`,
      xref: 'paper',
      yref: 'paper',
      x: 0.5,
      y: sizeIndex === 0 ? 1.1 : 0.45,
      showarrow: false,
      font: { size: 16 },
    });
  });

  // Create layout with subplots
  const layout: Partial<{
    grid: { rows: number; columns: number; pattern: 'independent' };
    title: { text: string; font: { size: number } };
    showlegend: boolean;
    legend: { orientation: 'h' | 'v'; y: number };
    annotations: typeof annotations;
    height: number;
    width: number;
    margin: { l: number; r: number; t: number; b: number };
    xaxis: { title: string; tickangle?: number; automargin?: boolean };
    xaxis2: { title: string; tickangle?: number; automargin?: boolean };
    yaxis: { title: string };
    yaxis2: { title: string };
  }> = {
    grid: {
      rows: 2,
      columns: 1,
      pattern: 'independent' as const,
    },
    title: {
      text: 'Wasmlets vs Pywavelets Performance Comparison<br><sub>(includes pywavelets with marshalling, discrete-wavelets excluded due to significantly slower performance)</sub>',
      font: { size: 20 },
    },
    showlegend: true,
    legend: {
      orientation: 'h' as const,
      y: -0.2,
    },
    annotations,
    height: 800,
    width: 1000,
    margin: {
      l: 50,
      r: 50,
      t: 100,
      b: 100,
    },
    xaxis: {
      title: 'Wavelet Type',
      tickangle: -45,
      automargin: true
    },
    xaxis2: {
      title: 'Wavelet Type',
      tickangle: -45,
      automargin: true
    },
    yaxis: { title: 'Time (ms)' },
    yaxis2: { title: 'Time (ms)' },
  };

  return (
    <div className="mt-8">
      <Plot
        data={data}
        layout={layout}
        config={{ responsive: true }}
      />
    </div>
  );
}
