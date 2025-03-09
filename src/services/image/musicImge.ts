import {
	loadImage,
	createCanvas,
	CanvasRenderingContext2D as NodeCanvasRenderingContext2D,
} from 'canvas';
import { MusicImageOptions } from "../../types/index";

/**
 * Validates that the time values are in an acceptable range.
 */
function validateTime(time: { currentTime: number; totalTime: number }): void {
	if (time.totalTime <= 0) {
		throw new Error('Invalid totalTime: must be greater than zero.');
	}
	if (time.currentTime < 0 || time.currentTime > time.totalTime) {
		throw new Error('Invalid currentTime: must be between 0 and totalTime.');
	}
}

/**
 * Validates the required properties of the MusicImageOptions.
 */
function validateInput(options: MusicImageOptions): void {
	if (!options.title) {
		throw new Error('Missing required option: title');
	}
	if (!options.artist) {
		throw new Error('Missing required option: artist');
	}
	if (!options.image) {
		throw new Error('Missing required option: image');
	}
	if (!options.time) {
		throw new Error('Missing required option: time');
	}
	validateTime(options.time);
}

/**
 * Formats seconds as "m:ss"
 */
function formatTime(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const sec = Math.floor(seconds % 60);
	return `${minutes}:${sec < 10 ? '0' + sec : sec}`;
}

/**
 * Draws a rounded rectangle on the canvas.
 * this is from random user on github i dont know who it is
 */
// function drawRoundedRect(
//   ctx: NodeCanvasRenderingContext2D,
//   x: number,
//   y: number,
//   width: number,
//   height: number,
//   radius: number
// ): void {
//   ctx.beginPath();
//   ctx.moveTo(x + radius, y);
//   ctx.lineTo(x + width - radius, y);
//   ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
//   ctx.lineTo(x + width, y + height - radius);
//   ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
//   ctx.lineTo(x + radius, y + height);
//   ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
//   ctx.lineTo(x, y + radius);
//   ctx.quadraticCurveTo(x, y, x + radius, y);
//   ctx.closePath();
// }

/**
 * Draws a glowing circle
 */
function drawGlowingCircle(
	ctx: NodeCanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
	color: string,
): void {
	ctx.save();
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, Math.PI * 2);
	ctx.shadowColor = color;
	ctx.shadowBlur = 15;
	ctx.fillStyle = color;
	ctx.fill();
	ctx.restore();
}

/**
 * Draws a wave visualizer effect
 */
function drawVisualizer(
	ctx: NodeCanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	color: string,
): void {
	const bars = 20;
	const barWidth = width / (bars * 2);
	const maxBarHeight = height;

	ctx.save();
	ctx.fillStyle = color;
	ctx.globalAlpha = 0.5;

	for (let i = 0; i < bars; i++) {
		const barHeight = Math.random() * maxBarHeight;
		const barX = x + i * barWidth * 2;
		const barY = y + (height - barHeight) / 2;

		ctx.beginPath();
		ctx.roundRect(barX, barY, barWidth, barHeight, barWidth / 2);
		ctx.fill();
	}
	ctx.restore();
}

/**
 * Draws a modern play button
 */
function drawPlayButton(
	ctx: NodeCanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	isPlaying: boolean = false,
): void {
	ctx.save();

	ctx.beginPath();
	ctx.arc(x, y, size, 0, Math.PI * 2);
	ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
	ctx.fill();

	ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
	ctx.lineWidth = 3;
	ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
	ctx.shadowBlur = 15;
	ctx.stroke();

	ctx.fillStyle = '#ffffff';
	if (isPlaying) {
		ctx.fillRect(x - size / 4, y - size / 3, size / 6, size / 1.5);
		ctx.fillRect(x + size / 8, y - size / 3, size / 6, size / 1.5);
	} else {
		ctx.beginPath();
		ctx.moveTo(x - size / 4, y - size / 3);
		ctx.lineTo(x + size / 3, y);
		ctx.lineTo(x - size / 4, y + size / 3);
		ctx.closePath();
		ctx.fill();
	}

	ctx.restore();
}

/**
 * Generates the music image with enhanced visuals
 */
export async function generateMusicImage(
	options: MusicImageOptions,
): Promise<Buffer> {
	validateInput(options);

	const width = 1200;
	const height = 630;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d') as NodeCanvasRenderingContext2D;

	// Create enhanced gradient background
	const gradient = ctx.createRadialGradient(
		width / 2,
		height / 2,
		0,
		width / 2,
		height / 2,
		height,
	);
	gradient.addColorStop(0, '#3a2a5a');
	gradient.addColorStop(0.5, '#2e1e3e');
	gradient.addColorStop(1, '#1a0f2a');
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, width, height);

	try {
		// Load and draw album art with enhanced effects
		const albumImage = await loadImage(options.image);
		const imageSize = height * 0.7;
		const imageX = width * 0.1;
		const imageY = (height - imageSize) / 2;

		// Draw enhanced glow behind album art
		ctx.save();
		ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
		ctx.shadowBlur = 60;
		ctx.drawImage(albumImage, imageX, imageY, imageSize, imageSize);
		ctx.restore();

		// Draw album art with enhanced frame
		ctx.save();
		ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
		ctx.shadowBlur = 35;
		ctx.shadowOffsetY = 20;

		// Draw enhanced frame
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
		ctx.lineWidth = 3;
		ctx.strokeRect(imageX - 3, imageY - 3, imageSize + 6, imageSize + 6);

		ctx.drawImage(albumImage, imageX, imageY, imageSize, imageSize);
		ctx.restore();

		// Draw text section
		const textX = imageX + imageSize + 60;
		const textWidth = width - textX - 40;

		// Draw title with enhanced glow
		ctx.save();
		ctx.font = 'bold 48px Arial';
		ctx.fillStyle = '#ffffff';
		ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
		ctx.shadowBlur = 20;
		ctx.fillText(
			truncateText(options.title ?? '', ctx, textWidth),
			textX,
			height * 0.3,
		);
		ctx.restore();

		// Draw artist with enhanced glow
		ctx.save();
		ctx.font = '32px Arial';
		ctx.fillStyle = '#d3d3d3';
		ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
		ctx.shadowBlur = 10;
		ctx.fillText(
			truncateText(options.artist ?? '', ctx, textWidth),
			textX,
			height * 0.3 + 50,
		);
		ctx.restore();

		// Draw enhanced visualizer
		drawVisualizer(
			ctx,
			textX,
			height * 0.45,
			textWidth,
			40,
			'rgba(174, 82, 221, 0.6)',
		);

		// Draw enhanced progress bar
		const progressBarY = height * 0.65;
		const progressBarWidth = textWidth;
		const progressBarHeight = 8;
		const progress = options.time.currentTime / options.time.totalTime;

		// Enhanced background bar
		ctx.save();
		ctx.beginPath();
		ctx.roundRect(
			textX,
			progressBarY,
			progressBarWidth,
			progressBarHeight,
			progressBarHeight / 2,
		);
		ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
		ctx.fill();

		// Enhanced progress gradient
		const progressGradient = ctx.createLinearGradient(
			textX,
			0,
			textX + progressBarWidth,
			0,
		);
		progressGradient.addColorStop(0, '#ae3ec9');
		progressGradient.addColorStop(0.5, '#8a51e3');
		progressGradient.addColorStop(1, '#3d5df0');

		ctx.beginPath();
		ctx.roundRect(
			textX,
			progressBarY,
			progressBarWidth * progress,
			progressBarHeight,
			progressBarHeight / 2,
		);
		ctx.fillStyle = progressGradient;
		ctx.fill();

		// Draw enhanced progress indicator
		const circleX = textX + progressBarWidth * progress;
		const circleY = progressBarY + progressBarHeight / 2;
		drawGlowingCircle(ctx, circleX, circleY, 10, '#ffffff');

		// Draw enhanced time stamps
		ctx.save();
		ctx.font = 'bold 24px Arial';
		ctx.fillStyle = '#d3d3d3';
		ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
		ctx.shadowBlur = 8;
		ctx.fillText(
			formatTime(options.time.currentTime),
			textX,
			progressBarY + 40,
		);
		ctx.textAlign = 'right';
		ctx.fillText(
			formatTime(options.time.totalTime),
			textX + progressBarWidth,
			progressBarY + 40,
		);
		ctx.restore();

		// Draw enhanced player controls
		const controlsY = height * 0.8;
		const controlSpacing = 80;
		const controlsStartX = textX + progressBarWidth / 2 - controlSpacing * 2;

		drawControl(ctx, controlsStartX, controlsY, '⏮', false, true);
		drawPlayButton(ctx, controlsStartX + controlSpacing, controlsY, 30, true);
		drawControl(
			ctx,
			controlsStartX + controlSpacing * 2,
			controlsY,
			'⏭',
			false,
			true,
		);
		drawControl(
			ctx,
			controlsStartX + controlSpacing * 3,
			controlsY,
			'🔊',
			false,
			true,
		);
		drawControl(
			ctx,
			controlsStartX + controlSpacing * 4,
			controlsY,
			'🔀',
			false,
			true,
		);
	} catch (error) {
		console.error('Error generating music image:', error);
	}

	return canvas.toBuffer();
}

/**
 * Truncates text to fit within a given width
 */
function truncateText(
	text: string,
	ctx: NodeCanvasRenderingContext2D,
	maxWidth: number,
): string {
	let truncated = text;
	while (ctx.measureText(truncated).width > maxWidth && truncated.length > 0) {
		truncated = truncated.slice(0, -1);
	}
	return truncated.length < text.length ? truncated + '...' : truncated;
}

/**
 * Draws an enhanced control button
 */
function drawControl(
	ctx: NodeCanvasRenderingContext2D,
	x: number,
	y: number,
	symbol: string,
	isMain: boolean = false,
	withGlow: boolean = false,
): void {
	ctx.save();
	ctx.font = isMain ? '48px Arial' : '32px Arial';
	ctx.fillStyle = isMain ? '#ffffff' : '#d3d3d3';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';

	if (withGlow) {
		ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
		ctx.shadowBlur = 15;
	}

	ctx.fillText(symbol, x, y);
	ctx.restore();
}
