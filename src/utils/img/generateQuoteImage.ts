export interface QuoteResponse {
  quote: string;
  author: string;
}

export async function generateQuoteImage(data: QuoteResponse): Promise<Buffer> {
  const { createCanvas } = await import('canvas');

  // Create canvas with fixed dimensions
  const width = 1400;
  const height = 800;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Generate base colors for gradient with improved contrast
  const h = Math.random() * 360;
  const s = 45 + Math.random() * 25; // Increased saturation
  const l = 80 + Math.random() * 10; // Brighter center

  // Enhanced radial gradient with multiple color stops
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    Math.max(width, height) / 1.2
  );
  gradient.addColorStop(0, `hsl(${h}, ${s}%, ${l + 8}%)`); // Brighter center
  gradient.addColorStop(0.3, `hsl(${(h + 15) % 360}, ${s + 5}%, ${l + 3}%)`);
  gradient.addColorStop(0.7, `hsl(${(h + 30) % 360}, ${s}%, ${l - 3}%)`);
  gradient.addColorStop(1, `hsl(${(h + 45) % 360}, ${s - 5}%, ${l - 8}%)`); // Darker edges
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Enhanced pattern overlay with softer lines
  ctx.strokeStyle = `hsla(${h}, ${s}%, ${l - 25}%, 0.06)`;
  ctx.lineWidth = 0.8;
  for (let i = 0; i < width; i += 35) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 45, height);
    ctx.stroke();
  }

  // Enhanced vignette effect
  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    height / 2.5,
    width / 2,
    height / 2,
    height
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.7, 'rgba(0,0,0,0.1)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // Improved text settings with darker color
  ctx.fillStyle = 'rgba(0,0,0,0.85)'; // More consistent dark color
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Quote text rendering with improved font
  ctx.font = '48px "Crimson Text", "Georgia", serif'; // Lighter weight serif font
  const maxWidth = width - 400;
  const words = data.quote.split(' ');
  let lines = [];
  let currentLine = '';

  // Text wrapping
  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);

  // Draw quote with elegant curly quotes
  let y = height / 2 - lines.length * 45;
  ctx.font = '72px "Crimson Text", "Georgia", serif';
  const quoteMarkOffset = 25;
  ctx.fillText('“', width / 2 - maxWidth / 2 - quoteMarkOffset, y - 10); // Opening curly quote

  ctx.font = '48px "Crimson Text", "Georgia", serif';
  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, y + index * 90);
  });

  const lastLineY = y + (lines.length - 1) * 90;
  ctx.font = '72px "Crimson Text", "Georgia", serif';
  ctx.fillText('”', width / 2 + maxWidth / 2 + quoteMarkOffset, lastLineY + 10); // Closing curly quote
  // Modern author styling with sans-serif font
  ctx.font = '36px "Open Sans", "Roboto", sans-serif';
  const authorY = lastLineY + 140;
  ctx.fillText(`— ${data.author} —`, width / 2, authorY);

  // Refined decorative underlines
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.2;
  const lineWidth = ctx.measureText(`— ${data.author} —`).width * 0.8;

  ctx.beginPath();
  ctx.moveTo(width / 2 - lineWidth, authorY + 25);
  ctx.bezierCurveTo(
    width / 2 - lineWidth / 2,
    authorY + 30,
    width / 2 + lineWidth / 2,
    authorY + 30,
    width / 2 + lineWidth,
    authorY + 25
  );
  ctx.stroke();

  // Subtle border
  ctx.strokeStyle = `hsla(${h}, ${s}%, ${l - 25}%, 0.15)`;
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, width - 8, height - 8);

  return canvas.toBuffer();
}
