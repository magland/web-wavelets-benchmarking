export interface BenchmarkResult {
  size: number;
  wavelet: string;
  wasmlets: {
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
  pywaveletsWithMarshalling: {
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
