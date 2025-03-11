import {
	loadImage,
	createCanvas,
	CanvasRenderingContext2D as NodeCanvasRenderingContext2D,
	Canvas,
	Image,
	CanvasGradient,
	CanvasPattern,
	ImageData,
	PngConfig,
	JpegConfig,
	PdfConfig,
	NodeCanvasRenderingContext2DSettings,
	DOMMatrix,
	DOMPoint,
} from 'canvas';

// Export a singleton to ensure we only load the native module once
class CanvasWrapper {
	private static instance: CanvasWrapper;

	private constructor() {
		// Initialize canvas module once
		try {
			// Test canvas creation to ensure it's working
			const testCanvas = createCanvas(10, 10);
			const ctx = testCanvas.getContext('2d');
			ctx.fillRect(0, 0, 10, 10);
			testCanvas.toBuffer();
		} catch (error) {
			console.error('Error initializing canvas:', error);
			throw error;
		}
	}

	public static getInstance(): CanvasWrapper {
		if (!CanvasWrapper.instance) {
			CanvasWrapper.instance = new CanvasWrapper();
		}
		return CanvasWrapper.instance;
	}

	public createCanvas(width: number, height: number): Canvas {
		return createCanvas(width, height);
	}

	public loadImage(src: string | Buffer): Promise<Image> {
		return loadImage(src);
	}
}

// Initialize singleton
const canvasInstance = CanvasWrapper.getInstance();

export {
	canvasInstance as canvas,
	NodeCanvasRenderingContext2D,
	Canvas,
	Image,
	CanvasGradient,
	CanvasPattern,
	ImageData,
	PngConfig,
	JpegConfig,
	PdfConfig,
	NodeCanvasRenderingContext2DSettings,
	DOMMatrix,
	DOMPoint,
};
