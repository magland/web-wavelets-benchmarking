import json
import matplotlib.pyplot as plt
import numpy as np

# discrete-wavelets is not included in the plot because it seems to be so much slower
include_discrete_wavelets = False

# Read benchmark results
with open('output/benchmark.json', 'r') as f:
    data = json.load(f)

# Extract unique sizes and wavelets
sizes = sorted(set(b['size'] for b in data['benchmarks']))
wavelets = sorted(set(b['wavelet'] for b in data['benchmarks']))

# Set up the plot
fig, axes = plt.subplots(len(sizes) + 1, 1, figsize=(12, 10))
if include_discrete_wavelets:
    fig.suptitle('Wasmlets vs Pywavelets vs Discrete-Wavelets Performance Comparison')
else:
    fig.suptitle('Wasmlets vs Pywavelets Performance Comparison')

# Width of each bar and positions of bar groups
bar_width = 0.1  # Reduced width to fit more bars
r1 = np.arange(len(wavelets))
r2 = [x + bar_width for x in r1]
r3 = [x + bar_width for x in r2]
r4 = [x + bar_width for x in r3]
r5 = [x + bar_width for x in r4]
r6 = [x + bar_width for x in r5]

# Plot for each size
for size_idx, size in enumerate(sizes):
    ax = axes[size_idx]
    size_data = [b for b in data['benchmarks'] if b['size'] == size]

    # Extract timing data for this size
    wasmlets_dec = [next(b['wasmlets']['timings']['wavedec'] for b in size_data if b['wavelet'] == w) for w in wavelets]
    wasmlets_rec = [next(b['wasmlets']['timings']['waverec'] for b in size_data if b['wavelet'] == w) for w in wavelets]
    pywavelets_dec = [next(b['pywavelets']['timings']['wavedec'] for b in size_data if b['wavelet'] == w) for w in wavelets]
    pywavelets_rec = [next(b['pywavelets']['timings']['waverec'] for b in size_data if b['wavelet'] == w) for w in wavelets]
    pywavelets_wm_dec = [next(b['pywaveletsWithMarshalling']['timings']['wavedec'] for b in size_data if b['wavelet'] == w) for w in wavelets]
    pywavelets_wm_rec = [next(b['pywaveletsWithMarshalling']['timings']['waverec'] for b in size_data if b['wavelet'] == w) for w in wavelets]
    if include_discrete_wavelets:
        discrete_dec = [next(b['discreteWavelets']['timings']['wavedec'] for b in size_data if b['wavelet'] == w) for w in wavelets]
        # Handle undefined waverec timings for discrete-wavelets
        discrete_rec = [next((b['discreteWavelets']['timings'].get('waverec') or float('nan')) for b in size_data if b['wavelet'] == w) for w in wavelets]
    else:
        discrete_dec = [float('nan')] * len(wavelets)
        discrete_rec = [float('nan')] * len(wavelets)

    # Create bars
    ax.bar(r1, wasmlets_dec, width=bar_width, label='Wasmlets Decomp', color='skyblue')
    ax.bar(r2, wasmlets_rec, width=bar_width, label='Wasmlets Recon', color='lightblue')
    ax.bar(r3, pywavelets_dec, width=bar_width, label='Pywavelets Decomp', color='coral')
    ax.bar(r4, pywavelets_rec, width=bar_width, label='Pywavelets Recon', color='salmon')
    ax.bar(r5, pywavelets_wm_dec, width=bar_width, label='Pywavelets w. Marshalling Decomp', color='orange')
    ax.bar(r6, pywavelets_wm_rec, width=bar_width, label='Pywavelets w. Marshalling Recon', color='wheat')
    if include_discrete_wavelets:
        ax.bar(r5, discrete_dec, width=bar_width, label='Discrete-Wavelets Decomposition', color='lightgreen')
        # Only plot reconstruction bars for discrete-wavelets if they're not all NaN
        if not all(np.isnan(discrete_rec)):
            ax.bar(r5, discrete_rec, width=bar_width, label='Discrete-Wavelets Reconstruction', color='darkgreen')

    # Customize plot
    ax.set_title(f'Array Size: {size:,.0f}')
    ax.set_xlabel('Wavelet Type')
    ax.set_ylabel('Time (ms)')
    ax.set_xticks([r + bar_width*2 for r in range(len(wavelets))])  # Adjusted center position
    ax.set_xticklabels(wavelets)
    if size == sizes[0]:
        ax.legend()
    ax.grid(True, alpha=0.3)


ax = axes[-1]

wasmlets_load = data['initializationTimings']['wasmlets']
pywavelets_load = data['initializationTimings']['pyodide']
ax.bar(0, wasmlets_load, width=bar_width, label='Wasmlets', color='skyblue')
ax.bar(1, pywavelets_load, width=bar_width, label='Pyodide+Pywt', color='coral')
ax.set_xticks([0, 1])
ax.set_xticklabels(['Wasmlets', 'Pyodide + Pywavelets'])
# log plot
ax.set_yscale('log')
ax.set_ylabel('Time (log ms)')
ax.legend()
ax.set_title('Startup')


plt.tight_layout()
plt.savefig('output/benchmark.png', dpi=300, bbox_inches='tight')