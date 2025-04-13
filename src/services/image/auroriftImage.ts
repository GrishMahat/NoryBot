// // src/services/image/auroriftImage.ts
// import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';
// // import { NodeCanvasRenderingContext2D, canvas , createCanvas, loadImage, CanvasRenderingContext2D} from './canvasWrapper';

// // Enhanced options interface with new features
// interface AuroraRiftImageOptions {
//   width?: number;              // Canvas width (default: 800)
//   height?: number;             // Canvas height (default: 300)
//   text?: string;               // Main text to display
//   subtext?: string;            // Optional smaller subtext
//   font?: string;               // Font family (default: 'Arial')
//   fontSize?: number;           // Main text size (default: 70)
//   color?: string;              // Primary aurora color
//   secondaryColor?: string;     // Secondary aurora color
//   glowIntensity?: number;      // Glow strength (0-1, default:mesini 0.8)
//   background?: string;         // Background color or image URL
//   particleCount?: number;      // Number of aurora particles (default: 50)
//   rippleEffect?: boolean;      // Add a ripple distortion (default: false)
//   pulseEffect?: boolean;       // Add a pulsing glow (default: false)
//   auroraStyle?: 'curtains' | 'diffuse' | 'waves'; // Aurora style (default: 'curtains')
//   streakIntensity?: number;    // Intensity of streak effect (0-1, default: 0.5)
//   foregroundElement?: string;  // URL of foreground image (e.g., silhouette)
//   lightCast?: boolean;         // Whether aurora casts light on foreground (default: true)
// }
// function drawBlurredRect(
//     ctx: CanvasRenderingContext2D,
//     x: number,
//     y: number,
//     w: number,
//     h: number,
//     color: string,
//     blurRadius: number
//   ) {
//     const steps = 5; // Number of steps for blur approximation
//     const offset = blurRadius / steps;
//     ctx.save();
//     ctx.globalAlpha = 1 / (steps * steps); // Reduce opacity for each draw
//     for (let dx = -blurRadius; dx <= blurRadius; dx += offset) {
//       for (let dy = -blurRadius; dy <= blurRadius; dy += offset) {
//         ctx.fillStyle = color;
//         ctx.fillRect(x + dx, y + dy, w, h);
//       }
//     }
//     ctx.restore();
//   }

// // Utility to draw aurora particles
// function drawAuroraParticles(ctx: CanvasRenderingContext2D, width: number, height: number, count: number, color: string) {
//   ctx.fillStyle = `${color}80`; // Semi-transparent
//   for (let i = 0; i < count; i++) {
//     const x = Math.random() * width;
//     const y = Math.random() * height;
//     const radius = Math.random() * 5 + 2;
//     ctx.beginPath();
//     ctx.arc(x, y, radius, 0, Math.PI * 2);
//     ctx.fill();
//   }
// }

// // Utility to draw aurora streaks
// function drawAuroraStreaks(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number, color: string) {
//   const streakCount = Math.floor(intensity * 20);
//   ctx.strokeStyle = `${color}40`; // Semi-transparent streaks
//   ctx.lineWidth = 2;
//   for (let i = 0; i < streakCount; i++) {
//     const xStart = Math.random() * width;
//     const yStart = Math.random() * height;
//     const length = Math.random() * 100 + 50;
//     const angle = Math.random() * Math.PI * 2;
//     const xEnd = xStart + length * Math.cos(angle);
//     const yEnd = yStart + length * Math.sin(angle);
//     ctx.beginPath();
//     ctx.moveTo(xStart, yStart);
//     ctx.lineTo(xEnd, yEnd);
//     ctx.stroke();
//   }
// }

// // Main function with enhanced features
// export async function generateAuroraRiftImage(options: AuroraRiftImageOptions): Promise<Buffer> {
//   // Default values
//   const {
//     width = 800,
//     height = 300,
//     text = 'Aurorift',
//     subtext = '',
//     font = 'Arial',
//     fontSize = 70,
//     color = '#00FFAA',         // Primary aurora green
//     secondaryColor = '#7B00FF', // Secondary purple
//     glowIntensity = 0.8,
//     background = '#1A1A2E',    // Cosmic dark
//     particleCount = 50,
//     rippleEffect = false,
//     pulseEffect = false,
//     auroraStyle = 'curtains',
//     streakIntensity = 0.5,
//     foregroundElement = '',
//     lightCast = true,
//   } = options;

//   // Create canvas
//   const canvas = createCanvas(width, height);
//   const ctx = canvas.getContext('2d');

//   // Background (image or color)
//   if (background.startsWith('http')) {
//     const bgImage = await loadImage(background);
//     ctx.drawImage(bgImage, 0, 0, width, height);
//   } else {
//     ctx.fillStyle = background;
//     ctx.fillRect(0, 0, width, height);
//   }

//   // Aurora effect based on style
//   if (auroraStyle === 'curtains') {
//     // Multiple vertical gradients for curtain effect
//     for (let i = 0; i < 3; i++) {
//       const gradX = width * (0.2 + i * 0.3);
//       const gradient = ctx.createLinearGradient(gradX, 0, gradX + 100, height);
//       gradient.addColorStop(0, `rgba(0, 255, 170, ${glowIntensity * 0.5})`);
//       gradient.addColorStop(0.5, color);
//       gradient.addColorStop(1, `rgba(123, 0, 255, ${glowIntensity * 0.5})`);
//       ctx.fillStyle = gradient;
//       ctx.fillRect(gradX - 50, 0, 150, height);
//     }
//   } else if (auroraStyle === 'diffuse') {
//     // Single, soft glow gradient
//     const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width);
//     gradient.addColorStop(0, color);
//     gradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
//     ctx.fillStyle = gradient;
//     ctx.fillRect(0, 0, width, height);
//   } else if (auroraStyle === 'waves') {
//     // Wavy horizontal gradients
//     const gradient = ctx.createLinearGradient(0, 0, 0, height);
//     gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
//     gradient.addColorStop(0.3, `${color}CC`);
//     gradient.addColorStop(0.7, `${secondaryColor}CC`);
//     gradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
//     ctx.fillStyle = gradient;
//     ctx.fillRect(0, 0, width, height);
//   }

//   // Add particles and streaks
//   drawAuroraParticles(ctx, width, height, particleCount, color);
//   drawAuroraStreaks(ctx, width, height, streakIntensity, secondaryColor);

//   // Ripple effect (optional)
//   if (rippleEffect) {
//     ctx.save();
//     drawBlurredRect(ctx, 0, height / 4, width, height / 2, color, 3);

//     ctx.globalAlpha = 0.4;
//     ctx.fillStyle = color;
//     ctx.restore();
//   }

//   // Pulse effect (optional)
//   if (pulseEffect) {
//     ctx.save();
//     ctx.globalAlpha = 0.3;
//     const pulseGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
//     pulseGradient.addColorStop(0, `${color}FF`);
//     pulseGradient.addColorStop(1, `rgba(0, 0, 0, 0)`);
//     ctx.fillStyle = pulseGradient;
//     ctx.fillRect(0, 0, width, height);
//     ctx.restore();
//   }

//   // Foreground element (if provided)
//   if (foregroundElement) {
//     const fgImage = await loadImage(foregroundElement);
//     const fgWidth = width * 0.6;
//     const fgHeight = (fgImage.height / fgImage.width) * fgWidth;
//     const fgX = (width - fgWidth) / 2;
//     const fgY = height - fgHeight;
//     ctx.drawImage(fgImage, fgX, fgY, fgWidth, fgHeight);

//     // Cast light on foreground
//     if (lightCast) {
//       ctx.globalCompositeOperation = 'overlay';
//       const lightGradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width);
//       lightGradient.addColorStop(0, `${color}80`);
//       lightGradient.addColorStop(1, 'transparent');
//       ctx.fillStyle = lightGradient;
//       ctx.fillRect(0, 0, width, height);
//       ctx.globalCompositeOperation = 'source-over';
//     }
//   }

//   // Main text with glow
//   ctx.font = `bold ${fontSize}px ${font}`;
//   const textGradient = ctx.createLinearGradient(0, 0, width, height);
//   textGradient.addColorStop(0, color);
//   textGradient.addColorStop(1, secondaryColor);
//   ctx.fillStyle = textGradient;
//   ctx.textAlign = 'center';
//   ctx.textBaseline = 'middle';
//   const textX = width / 2;
//   const textY = subtext ? height / 2 - 20 : height / 2;
//   ctx.shadowColor = color;
//   ctx.shadowBlur = 25 * glowIntensity;
//   ctx.fillText(text, textX, textY);

//   // Subtext (smaller, below main text)
//   if (subtext) {
//     ctx.font = `bold ${fontSize / 2}px ${font}`;
//     ctx.shadowBlur = 15 * glowIntensity;
//     ctx.fillText(subtext, textX, textY + fontSize);
//   }

//   // Extra glow pass for vibrancy
//   ctx.shadowColor = secondaryColor;
//   ctx.fillText(text, textX, textY);
//   if (subtext) ctx.fillText(subtext, textX, textY + fontSize);

//   // Return buffer
//   return canvas.toBuffer('image/png');
// }
// import fs from 'fs';
// // Example usage
// async function exampleCommand() {
//   const imageBuffer = await generateAuroraRiftImage({
//     text: 'Welcome Norysight',
//     subtext: 'Rift Voyager',
//     color: '#00FFAA',
//     secondaryColor: '#FF00AA',
//     glowIntensity: 0.9,
//     background: '#0F0F1A',
//     particleCount: 100,
//     auroraStyle: 'waves',
//     streakIntensity: 0.7,
//     foregroundElement: 'https://example.com/silhouette.png',
//     lightCast: true,
//     rippleEffect: true,
// 		pulseEffect: true,
// 	});
// 	fs.writeFileSync('aurorift.png', imageBuffer);
// 	console.log('Image saved to aurorift.png');
// }
// exampleCommand();
