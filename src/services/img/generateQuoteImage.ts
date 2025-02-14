import type { CanvasRenderingContext2D as NodeCanvasRenderingContext2D } from 'canvas';

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

function validateInput(data: QuoteResponse): void {
  if (!data.quote || typeof data.quote !== 'string') {
    throw new Error('Quote must be a non-empty string');
  }
  if (!data.author || typeof data.author !== 'string') {
    throw new Error('Author must be a non-empty string');
  }
}

function applyShadow(
  ctx: NodeCanvasRenderingContext2D,
  options = {
    color: 'rgba(255,255,255,0.4)',
    blur: 3,
    offsetX: 1,
    offsetY: 1,
  },
): void {
  ctx.shadowColor = options.color;
  ctx.shadowBlur = options.blur;
  ctx.shadowOffsetX = options.offsetX;
  ctx.shadowOffsetY = options.offsetY;
}

function createGradientBackground(
  ctx: NodeCanvasRenderingContext2D,
  width: number,
  height: number,
  options?: QuoteResponse['gradient'],
): { h: number; s: number; l: number } {
  const h = Math.random() * 360;
  const s = 50 + Math.random() * 30;
  const l = 75 + Math.random() * 15;

  let gradient;
  if (options?.type === 'linear') {
    gradient = ctx.createLinearGradient(0, 0, width, height);
  } else {
    gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      Math.max(width, height) / 1.1,
    );
  }

  if (options?.colors) {
    options.colors.forEach((color, index) => {
      gradient.addColorStop(index / (options.colors.length - 1), color);
    });
  } else {
    gradient.addColorStop(0, `hsl(${h}, ${s}%, ${l + 10}%)`);
    gradient.addColorStop(0.2, `hsl(${(h + 10) % 360}, ${s + 8}%, ${l + 5}%)`);
    gradient.addColorStop(0.5, `hsl(${(h + 20) % 360}, ${s + 5}%, ${l}%)`);
    gradient.addColorStop(0.8, `hsl(${(h + 30) % 360}, ${s}%, ${l - 5}%)`);
    gradient.addColorStop(1, `hsl(${(h + 40) % 360}, ${s - 8}%, ${l - 10}%)`);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return { h, s, l };
}

function addPatternOverlay(
  ctx: NodeCanvasRenderingContext2D,
  width: number,
  height: number,
  h: number,
  s: number,
  l: number,
  pattern?: QuoteResponse['pattern'],
): void {
  const opacity = pattern?.opacity ?? 0.04;
  const scale = pattern?.scale ?? 1;
  ctx.fillStyle = `hsla(${h}, ${s}%, ${l - 30}%, ${opacity})`;
  ctx.strokeStyle = `hsla(${h}, ${s}%, ${l - 30}%, ${opacity})`;

  switch (pattern?.type) {
    case 'dots': {
      const spacing = 30 * scale;
      for (let x = spacing; x < width; x += spacing) {
        for (let y = spacing; y < height; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 2 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'grid':
      ctx.lineWidth = 0.5 * scale;
      for (let x = 0; x < width; x += 30 * scale) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 30 * scale) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      break;

    case 'waves': {
      ctx.lineWidth = 0.8 * scale;
      const amplitude = 20 * scale;
      const frequency = 0.02 / scale;
      for (let y = 0; y < height; y += 50 * scale) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < width; x += 1) {
          ctx.lineTo(x, y + Math.sin(x * frequency) * amplitude);
        }
        ctx.stroke();
      }
      break;
    }

    case 'chevron': {
      ctx.lineWidth = 0.8 * scale;
      const chevronWidth = 40 * scale;
      const chevronHeight = 20 * scale;
      for (let y = 0; y < height; y += chevronHeight * 2) {
        for (let x = 0; x < width; x += chevronWidth) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + chevronWidth / 2, y + chevronHeight);
          ctx.lineTo(x + chevronWidth, y);
          ctx.stroke();
        }
      }
      break;
    }

    case 'lines':
    default:
      ctx.lineWidth = 0.6 * scale;
      for (let i = 0; i < width; i += 30 * scale) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 50 * scale, height);
        ctx.stroke();
      }
      break;
  }
}

function addVignetteEffect(
  ctx: NodeCanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    height / 2.2,
    width / 2,
    height / 2,
    height * 1.1,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.6, 'rgba(0,0,0,0.08)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.18)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

function setupTextStyle(ctx: NodeCanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  applyShadow(ctx);
}

interface TextMetrics {
  lines: string[];
  fontSize: number;
  lineHeight: number;
}

function calculateOptimalFontSize(
  ctx: NodeCanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
): TextMetrics {
  let upperBound = 72;
  let lowerBound = 20;
  const lineHeightRatio = 1.6;
  let fontSize = upperBound;
  let lines: string[] = [];
  let lineHeight = fontSize * lineHeightRatio;

  // Binary search for optimal font size
  while (upperBound - lowerBound > 1) {
    fontSize = Math.floor((upperBound + lowerBound) / 2);
    lineHeight = fontSize * lineHeightRatio;

    ctx.font = `bold ${fontSize}px "Playfair Display", Georgia, "Times New Roman", serif`;
    lines = wrapText(ctx, text, maxWidth);

    const totalHeight = lines.length * lineHeight;

    if (
      totalHeight > maxHeight ||
      lines.some((line) => ctx.measureText(line).width > maxWidth)
    ) {
      upperBound = fontSize;
    } else {
      lowerBound = fontSize;
    }
  }

  // Final adjustment
  fontSize = lowerBound;
  lineHeight = fontSize * lineHeightRatio;
  ctx.font = `bold ${fontSize}px "Playfair Display", Georgia, "Times New Roman", serif`;
  lines = wrapText(ctx, text, maxWidth);

  return { lines, fontSize, lineHeight };
}

function wrapText(
  ctx: NodeCanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function drawQuoteText(
  ctx: NodeCanvasRenderingContext2D,
  lines: string[],
  width: number,
  height: number,
  maxWidth: number,
  fontSize: number,
  lineHeight: number,
): { lastLineY: number } {
  const y = height / 2 - (lines.length * lineHeight) / 2;
  const quoteMarkOffset = fontSize * 0.6;

  // Draw opening quote mark with fallback fonts
  applyShadow(ctx, {
    color: 'rgba(255,255,255,0.5)',
    blur: 4,
    offsetX: 1,
    offsetY: 1,
  });
  ctx.font = `${fontSize * 1.7}px "Playfair Display", Georgia, "Times New Roman", serif`;
  ctx.fillText(
    '❝',
    width / 2 - maxWidth / 2 - quoteMarkOffset,
    y - fontSize * 0.3,
  );

  // Draw quote text with fallback fonts
  applyShadow(ctx);
  ctx.font = `bold ${fontSize}px "Playfair Display", Georgia, "Times New Roman", serif`;
  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, y + index * lineHeight);
  });

  const lastLineY = y + (lines.length - 1) * lineHeight;

  // Draw closing quote mark with fallback fonts
  applyShadow(ctx, {
    color: 'rgba(255,255,255,0.5)',
    blur: 4,
    offsetX: 1,
    offsetY: 1,
  });
  ctx.font = `${fontSize * 1.7}px "Playfair Display", Georgia, "Times New Roman", serif`;
  ctx.fillText(
    '❞',
    width / 2 + maxWidth / 2 + quoteMarkOffset,
    lastLineY + fontSize * 0.3,
  );

  return { lastLineY };
}

function drawAuthor(
  ctx: NodeCanvasRenderingContext2D,
  author: string,
  width: number,
  lastLineY: number,
): { authorY: number } {
  applyShadow(ctx, {
    color: 'rgba(255,255,255,0.3)',
    blur: 2,
    offsetX: 1,
    offsetY: 1,
  });
  ctx.font = '42px "Montserrat", "Open Sans", Arial, sans-serif';
  const authorY = lastLineY + 150;
  ctx.fillText(`— ${author} —`, width / 2, authorY);
  return { authorY };
}

function drawDecorativeFlourishes(
  ctx: NodeCanvasRenderingContext2D,
  author: string,
  width: number,
  authorY: number,
): void {
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.5;
  const lineWidth = ctx.measureText(`— ${author} —`).width * 0.9;

  applyShadow(ctx, {
    color: 'rgba(255,255,255,0.2)',
    blur: 1,
    offsetX: 0,
    offsetY: 1,
  });
  ctx.beginPath();
  ctx.moveTo(width / 2 - lineWidth, authorY + 30);
  ctx.bezierCurveTo(
    width / 2 - lineWidth / 2,
    authorY + 35,
    width / 2 + lineWidth / 2,
    authorY + 35,
    width / 2 + lineWidth,
    authorY + 30,
  );
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width / 2 - lineWidth, authorY + 35);
  ctx.bezierCurveTo(
    width / 2 - lineWidth / 2,
    authorY + 40,
    width / 2 + lineWidth / 2,
    authorY + 40,
    width / 2 + lineWidth,
    authorY + 35,
  );
  ctx.stroke();
}

function drawBorder(
  ctx: NodeCanvasRenderingContext2D,
  width: number,
  height: number,
  h: number,
  s: number,
  l: number,
): void {
  ctx.strokeStyle = `hsla(${h}, ${s}%, ${l - 30}%, 0.2)`;
  ctx.lineWidth = 8;
  ctx.beginPath();
  const radius = 15;
  ctx.moveTo(radius, 4);
  ctx.lineTo(width - radius, 4);
  ctx.quadraticCurveTo(width - 4, 4, width - 4, radius);
  ctx.lineTo(width - 4, height - radius);
  ctx.quadraticCurveTo(width - 4, height - 4, width - radius, height - 4);
  ctx.lineTo(radius, height - 4);
  ctx.quadraticCurveTo(4, height - 4, 4, height - radius);
  ctx.lineTo(4, radius);
  ctx.quadraticCurveTo(4, 4, radius, 4);
  ctx.stroke();
}

function calculateCanvasDimensions(quote: string): {
  width: number;
  height: number;
} {
  const baseWidth = 1400;
  const baseHeight = 800;
  const minWidth = 800;
  const maxWidth = 2000;
  const minHeight = 600;
  const maxHeight = 1200;

  // Calculate rough dimensions based on text length
  const textLength = quote.length;
  let width = baseWidth;
  let height = baseHeight;

  if (textLength > 200) {
    // For very long quotes, increase height more than width
    width = Math.min(maxWidth, baseWidth + Math.floor(textLength / 10) * 20);
    height = Math.min(maxHeight, baseHeight + Math.floor(textLength / 8) * 15);
  } else if (textLength < 50) {
    // For very short quotes, decrease dimensions
    width = Math.max(
      minWidth,
      baseWidth - Math.floor((50 - textLength) / 2) * 20,
    );
    height = Math.max(
      minHeight,
      baseHeight - Math.floor((50 - textLength) / 2) * 15,
    );
  }

  // Ensure aspect ratio stays reasonable
  const aspectRatio = width / height;
  if (aspectRatio > 2) {
    height = width / 2;
  } else if (aspectRatio < 1) {
    width = height;
  }

  return { width, height };
}

export async function generateQuoteImage(data: QuoteResponse): Promise<Buffer> {
  validateInput(data);

  const { createCanvas } = await import('canvas');

  const { width, height } = calculateCanvasDimensions(data.quote);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const { h, s, l } = createGradientBackground(
    ctx,
    width,
    height,
    data.gradient,
  );
  addPatternOverlay(ctx, width, height, h, s, l, data.pattern);
  addVignetteEffect(ctx, width, height);
  setupTextStyle(ctx);

  const maxWidth = width * 0.75; //  canvas width
  const maxTextHeight = height * 0.6; //  height
  const { lines, fontSize, lineHeight } = calculateOptimalFontSize(
    ctx,
    data.quote,
    maxWidth,
    maxTextHeight,
  );
  const { lastLineY } = drawQuoteText(
    ctx,
    lines,
    width,
    height,
    maxWidth,
    fontSize,
    lineHeight,
  );
  const { authorY } = drawAuthor(ctx, data.author, width, lastLineY);

  drawDecorativeFlourishes(ctx, data.author, width, authorY);
  drawBorder(ctx, width, height, h, s, l);

  return canvas.toBuffer();
}
