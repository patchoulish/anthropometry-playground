import { Plot } from "./plot.js";

/**
 * A plot that displays data distribution as a histogram.
 * @extends Plot
 */
class HistogramPlot extends Plot {
	/**
	 * Creates a new HistogramPlot.
	 * @param {import("../math.js").Series[]} series - The data series to plot.
	 * @param {string[]} seriesColors - Colors for each series.
	 * @param {string[]} seriesLabels - Labels for each series.
	 * @param {number} [lineThickness=1] - Thickness of lines (unused in histogram bars, but kept for signature compatibility).
	 * @param {Object} [lineOfInterest={ x: undefined }] - An optional vertical line to draw.
	 * @param {number} [binCount=32] - The target number of bins.
	 * @param {Object} [padding] - Padding around the plot.
	 * @param {string} [xLabel=""] - Label for the X axis.
	 * @param {boolean} [darkMode=false] - Whether to render in dark mode.
	 */
	constructor(
		series,
		seriesColors,
		seriesLabels,
		lineThickness = 1,
		lineOfInterest = { x: undefined },
		binCount = 32,
		padding = { top: 20, right: 20, bottom: 20, left: 20 },
		xLabel = "",
		darkMode = false,
	) {
		super(padding, darkMode);

		this.series = series;
		this.seriesColors = seriesColors;
		this.seriesLabels = seriesLabels;
		this.lineThickness = lineThickness;
		this.lineOfInterest = lineOfInterest;
		this.binCount = binCount;
		this.xLabel = xLabel;
	}

	/**
	 * Renders the histogram plot.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 * @param {number} width - The logical width of the canvas.
	 * @param {number} height - The logical height of the canvas.
	 */
	handleRender(ctx, width, height) {
		const bounds = this.calculateBounds();

		// Clip and draw chart elements
		ctx.save();
		this.clipChartArea(ctx, width, height);

		this.drawHistogramBars(ctx, width, height, bounds);
		this.drawLineOfInterest(
			ctx,
			width,
			height,
			bounds,
			this.lineOfInterest.x,
		);
		ctx.restore();

		// Draw axes and labels on top, outside the clip region
		this.drawAxes(ctx, width, height, bounds);
	}

	/**
	 * Calculates the data bounds (min/max X).
	 * @returns {{minX: number, maxX: number}} The bounds.
	 */
	calculateBounds() {
		const xs = this.series.flatMap((s) => s.valuesOf("x"));
		return {
			minX: Math.min(...xs),
			maxX: Math.max(...xs),
		};
	}

	/**
	 * Draws the axes and labels.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 * @param {number} width - Width of the plot.
	 * @param {number} height - Height of the plot.
	 * @param {Object} bounds - Data bounds.
	 */
	drawAxes(ctx, width, height, bounds) {
		const left = this.padding.left;
		const right = width - this.padding.right;
		const bottom = height - this.padding.bottom;

		this.drawXAxisLine(ctx, left, right, bottom);
		this.drawXAxisTicks(ctx, left, right, bottom, bounds);
		this.drawXAxisLabel(ctx, width, height, this.xLabel);
	}

	/**
	 * Draws the histogram bars.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 * @param {number} width - Width of the plot.
	 * @param {number} height - Height of the plot.
	 * @param {Object} bounds - Data bounds.
	 */
	drawHistogramBars(ctx, width, height, bounds) {
		ctx.save();

		const left = this.padding.left;
		const right = width - this.padding.right;
		const top = this.padding.top;
		const bottom = height - this.padding.bottom;
		const drawableHeight = bottom - top;

		// Determine effective bin count: clamp between 1 and distinct value count, capped by binCount.
		const allXs = this.series.flatMap((s) => s.valuesOf("x"));
		const distinctCount = Math.max(1, new Set(allXs).size);
		const binCount = Math.min(this.binCount, distinctCount);

		const span = bounds.maxX - bounds.minX || 1; // avoid zero span
		const binWidthValue = span / binCount;

		// Build bins per series: counts.
		const allSeriesBins = this.series.map((s) => {
			const xs = s.valuesOf("x");
			const bins = new Array(binCount).fill(0);
			for (const x of xs) {
				const idx =
					x === bounds.maxX
						? binCount - 1
						: Math.floor((x - bounds.minX) / binWidthValue);
				if (idx >= 0 && idx < binCount) bins[idx]++;
			}
			return bins;
		});

		// Global max for scaling.
		const maxCount = Math.max(
			...allSeriesBins.flatMap((bins) => bins),
			1, // avoid divide by zero
		);

		const binPixelWidth = (right - left) / binCount;

		for (let b = 0; b < binCount; b++) {
			const binLeft = left + b * binPixelWidth;

			for (let si = 0; si < this.series.length; si++) {
				const count = allSeriesBins[si][b];
				if (count === 0) continue;

				const barHeight = (count / maxCount) * drawableHeight;
				const x0 = binLeft;
				const y0 = bottom - barHeight;

				ctx.fillStyle = this.seriesColors[si];
				ctx.globalAlpha = 0.7;
				ctx.fillRect(x0, y0, binPixelWidth, barHeight);
			}
		}

		ctx.restore();
	}
}

export { HistogramPlot };
