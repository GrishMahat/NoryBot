interface ProgressBarOptions {
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  height?: number;
}

export interface MusicImageOptions {
  title: string | undefined;
  artist: string | undefined;
  album?: string;
  image: string | undefined;
  time: {
    currentTime: number;
    totalTime: number;
  };
  progressBar?: ProgressBarOptions;
}
export interface QuoteResponse {
  quote: string;
  author: string;
  gradient?: {
    type: 'linear' | 'radial';
    colors?: string[];
  };
  pattern?: {
    type: 'dots' | 'lines' | 'grid' | 'waves' | 'chevron';
    opacity?: number;
    scale?: number;
  };
}