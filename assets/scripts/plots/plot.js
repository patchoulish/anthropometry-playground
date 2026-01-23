/**
 * Base class for all plots.
 * Provides shared rendering logic for axes, labels, and canvas management.
 */
class Plot {
	/**
	 * Creates a new Plot instance.
	 * @param {Object} padding - Padding around the plot area.
	 * @param {boolean} darkMode - Whether to render in dark mode.
	 */
	constructor(
		padding = { top: 20, right: 20, bottom: 20, left: 20 },
		darkMode = false,
	) {
		this.padding = padding;
		this.darkMode = darkMode;
	}

	/**
	 * Renders the plot to the given canvas.
	 * @param {HTMLCanvasElement} canvas - The canvas to render to.
	 */
	render(canvas) {
		const dpr = window.devicePixelRatio || 1;
		const ctx = canvas.getContext("2d");

		// Adjust for high-DPI displays if needed, or assume caller handles canvas sizing vs stylings.
		// However, in the original code, it was:
		// ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
		// asking context for width/dpr implies canvas.width is physical pixels.
		// Let's stick to the original logic where we pass logical width/height to handleRender.

		const width = canvas.width / dpr;
		const height = canvas.height / dpr;

		ctx.save();
		// Scale if the canvas coordinate system isn't already scaled.
		// The original code didn't explicitily scale, but it used `width / dpr`.
		// If the canvas buffer size is scaled but the context isn't, we might need to scale.
		// NOTE: The original code didn't ctx.scale(dpr, dpr).
		// It just passed `canvas.width / dpr` to `handleRender`.
		// Let's assume the canvas is set up correctly externally or we follow the original pattern.

		ctx.clearRect(0, 0, width, height);
		ctx.restore();

		this.handleRender(ctx, width, height);
	}

	/**
	 * Handles the specific rendering logic for the plot.
	 * Must be implemented by derived classes.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 * @param {number} width - The logical width of the canvas.
	 * @param {number} height - The logical height of the canvas.
	 */
	handleRender(ctx, width, height) {
		throw new Error("handleRender() not implemented in base Plot class.");
	}

	/**
	 * Configures standard text and stroke styles.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 */
	configureContext(ctx) {
		ctx.strokeStyle = this.darkMode ? "#FFFFFF" : "#000000";
		ctx.fillStyle = this.darkMode ? "#FFFFFF" : "#000000";
		ctx.lineWidth = 1;
		ctx.font = "12px monospace";
	}

	/**
	 * Draws the X-axis line.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 * @param {number} left - The left coordinate.
	 * @param {number} right - The right coordinate.
	 * @param {number} bottom - The bottom coordinate.
	 */
	drawXAxisLine(ctx, left, right, bottom) {
		ctx.save();
		this.configureContext(ctx);
		ctx.beginPath();
		ctx.moveTo(left, bottom);
		ctx.lineTo(right, bottom);
		ctx.stroke();
		ctx.restore();
	}

	/**
	 * Draws the Y-axis line.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 * @param {number} left - The left coordinate.
	 * @param {number} top - The top coordinate.
	 * @param {number} bottom - The bottom coordinate.
	 */
	drawYAxisLine(ctx, left, top, bottom) {
		ctx.save();
		this.configureContext(ctx);
		ctx.beginPath();
		ctx.moveTo(left, top);
		ctx.lineTo(left, bottom);
		ctx.stroke();
		ctx.restore();
	}

	/**
	 * Draws ticks along the X-axis.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 * @param {number} left - The left coordinate.
	 * @param {number} right - The right coordinate.
	 * @param {number} bottom - The bottom coordinate.
	 * @param {Object} bounds - The data bounds { minX, maxX }.
	 * @param {number} tickCount - The number of ticks to draw.
	 */
	drawXAxisTicks(ctx, left, right, bottom, bounds, tickCount = 5) {
		ctx.save();
		this.configureContext(ctx);
		ctx.textAlign = "center";
		ctx.textBaseline = "top";

		for (let i = 0; i <= tickCount; i++) {
			const t = i / tickCount;
			const x = left + t * (right - left);
			const value = bounds.minX + t * (bounds.maxX - bounds.minX);

			ctx.beginPath();
			ctx.moveTo(x, bottom);
			ctx.lineTo(x, bottom + 5);
			ctx.stroke();

			ctx.fillText(value.toFixed(1), x, bottom + 7);
		}
		ctx.restore();
	}

	/**
	 * Draws ticks along the Y-axis.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 * @param {number} left - The left coordinate.
	 * @param {number} top - The top coordinate.
	 * @param {number} bottom - The bottom coordinate.
	 * @param {Object} bounds - The data bounds { minY, maxY }.
	 * @param {number} tickCount - The number of ticks to draw.
	 */
	drawYAxisTicks(ctx, left, top, bottom, bounds, tickCount = 5) {
		ctx.save();
		this.configureContext(ctx);
		ctx.textAlign = "right";
		ctx.textBaseline = "middle";

		for (let i = 0; i <= tickCount; i++) {
			const t = i / tickCount;
			const y = bottom - t * (bottom - top);
			const value = bounds.minY + t * (bounds.maxY - bounds.minY);

			ctx.beginPath();
			ctx.moveTo(left, y);
			ctx.lineTo(left - 5, y);
			ctx.stroke();

			ctx.fillText(value.toFixed(1), left - 7, y);
		}
		ctx.restore();
	}

	/**
	 * Draws the X-axis label.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 * @param {number} width - The canvas logical width.
	 * @param {number} height - The canvas logical height.
	 * @param {string} label - The label text.
	 */
	drawXAxisLabel(ctx, width, height, label) {
		if (!label) return;
		ctx.save();
		this.configureContext(ctx);
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText(label, width / 2, height - this.padding.bottom + 25);
		ctx.restore();
	}

	/**
	 * Draws the Y-axis label.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 * @param {number} width - The canvas logical width.
	 * @param {number} height - The canvas logical height.
	 * @param {string} label - The label text.
	 */
	drawYAxisLabel(ctx, width, height, label) {
		if (!label) return;
		ctx.save();
		this.configureContext(ctx);
		ctx.translate(15, height / 2);
		ctx.rotate(-Math.PI / 2);
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText(label, 0, 0);
		ctx.restore();
	}

	/**
	 * Draws a vertical line of interest.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 * @param {number} width - The canvas logical width.
	 * @param {number} height - The canvas logical height.
	 * @param {Object} bounds - The data bounds.
	 * @param {number} xValue - The X value to draw the line at.
	 */
	drawLineOfInterest(ctx, width, height, bounds, xValue) {
		if (xValue === undefined) return;

		const left = this.padding.left;
		const right = width - this.padding.right;
		const top = this.padding.top;
		const bottom = height - this.padding.bottom;

		if (xValue < bounds.minX || xValue > bounds.maxX) return;

		const px =
			left +
			((xValue - bounds.minX) / (bounds.maxX - bounds.minX)) *
				(right - left);

		ctx.save();
		this.configureContext(ctx);
		ctx.beginPath();
		ctx.moveTo(px, top);
		ctx.lineTo(px, bottom);
		ctx.stroke();
		ctx.restore();
	}
}

export { Plot };
