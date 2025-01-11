import { BenchmarkResult } from '../benchmarkTypes';

interface ResultsTableProps {
  results: BenchmarkResult[];
}

export function ResultsTable({ results }: ResultsTableProps) {
  const exportToCsv = () => {
    // Define CSV headers
    const headers = [
      'Size',
      'Wavelet',
      'Wasmlets Wavedec (ms)',
      'Wasmlets Waverec (ms)',
      'Pywavelets Wavedec (ms)',
      'Pywavelets Waverec (ms)',
      'Pywavelets With Marshalling Wavedec (ms)',
      'Pywavelets With Marshalling Waverec (ms)',
      'DiscreteWavelets Wavedec (ms)'
    ];

    // Convert results to CSV rows
    const csvRows = results.map(result => [
      result.size,
      result.wavelet,
      result.wasmlets.timings.wavedec.toFixed(2),
      result.wasmlets.timings.waverec.toFixed(2),
      result.pywavelets.timings.wavedec.toFixed(2),
      result.pywavelets.timings.waverec.toFixed(2),
      result.pywaveletsWithMarshalling.timings.wavedec.toFixed(2),
      result.pywaveletsWithMarshalling.timings.waverec.toFixed(2),
      result.discreteWavelets.timings.wavedec.toFixed(2)
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'benchmark_results.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={exportToCsv}
          className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Size
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Wavelet
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Wasmlets Wavedec (ms)
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Wasmlets Waverec (ms)
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Pywavelets Wavedec (ms)
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Pywavelets Waverec (ms)
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Pywavelets With Marshalling Wavedec (ms)
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Pywavelets With Marshalling Waverec (ms)
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              DiscreteWavelets Wavedec (ms)
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {results.map((result, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {result.size.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {result.wavelet}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {result.wasmlets.timings.wavedec.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {result.wasmlets.timings.waverec.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {result.pywavelets.timings.wavedec.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {result.pywavelets.timings.waverec.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {result.pywaveletsWithMarshalling.timings.wavedec.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {result.pywaveletsWithMarshalling.timings.waverec.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {result.discreteWavelets.timings.wavedec.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
