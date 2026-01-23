import { Plot } from "./plot.js";

/**
 * A plot that displays data distribution as density curves.
 * @extends Plot
 */
class DensityPlot extends Plot {
	/**
	 * Creates a new DensityPlot.
	 * @param {import("../math.js").Series[]} series - The data series to plot.
	 * @param {string[]} seriesColors - Colors for each series.
	 * @param {string[]} seriesLabels - Labels for each series.
	 * @param {number} [lineThickness=3] - Thickness of the density curve lines.
	 * @param {Object} [lineOfInterest={ x: undefined }] - An optional vertical line to draw.
	 * @param {Object} [padding] - Padding around the plot.
	 * @param {string} [xLabel=""] - Label for the X axis.
	 * @param {boolean} [darkMode=false] - Whether to render in dark mode.
	 */
	constructor(
		series,
		seriesColors,
		seriesLabels,
		lineThickness = 3,
		lineOfInterest = { x: undefined },
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
		this.xLabel = xLabel;
	}

	/**
	 * Renders the density plot.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 * @param {number} width - The logical width of the canvas.
	 * @param {number} height - The logical height of the canvas.
	 */
	handleRender(ctx, width, height) {
		const bounds = this.calculateBounds();

		// Clip and draw chart elements
		ctx.save();
		this.clipChartArea(ctx, width, height);

		this.drawSigmaLines(ctx, width, height, bounds);
		this.drawDensityCurves(ctx, width, height, bounds);
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
	 * Draws sigma lines (mean, +/- 1std, +/- 2std) for each series.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 * @param {number} width - Width of the plot.
	 * @param {number} height - Height of the plot.
	 * @param {Object} bounds - Data bounds.
	 */
	drawSigmaLines(ctx, width, height, bounds) {
		ctx.save();
		this.configureContext(ctx);

		const left = this.padding.left;
		const right = width - this.padding.right;
		const bottom = height - this.padding.bottom;
		const drawableHeight = bottom - this.padding.top;

		ctx.lineWidth = 1;
		ctx.globalAlpha = 0.5;
		ctx.setLineDash([4, 4]);

		// --- Precompute global max density ---
		const sampleCount = 256;
		let maxDensity = 0;

		for (const s of this.series) {
			const pdf = s.pdf("x");

			for (let i = 0; i < sampleCount; i++) {
				const t = i / (sampleCount - 1);
				const x = bounds.minX + t * (bounds.maxX - bounds.minX);
				maxDensity = Math.max(maxDensity, pdf(x));
			}
		}

		// --- Draw clipped sigma lines ---
		for (let i = 0; i < this.series.length; i++) {
			const s = this.series[i];
			const color = this.seriesColors[i];

			const mean = s.mean("x");
			const std = s.stddev("x");
			const pdf = s.pdf("x");

			const positions = [
				mean,
				mean - 2 * std,
				mean - 1 * std,
				mean + 1 * std,
				mean + 2 * std,
			];

			ctx.strokeStyle = color;

			for (const x of positions) {
				if (x < bounds.minX || x > bounds.maxX) continue;

				const density = pdf(x);

				const px =
					left +
					((x - bounds.minX) / (bounds.maxX - bounds.minX)) *
						(right - left);

				const py = bottom - (density / maxDensity) * drawableHeight;

				ctx.beginPath();
				ctx.moveTo(px, bottom);
				ctx.lineTo(px, py);
				ctx.stroke();
			}
		}

		ctx.restore();
	}

	/**
	 * Draws the probability density curves.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 * @param {number} width - Width of the plot.
	 * @param {number} height - Height of the plot.
	 * @param {Object} bounds - Data bounds.
	 * @param {number} [sampleCount=256] - Number of points to sample for the curve.
	 */
	drawDensityCurves(ctx, width, height, bounds, sampleCount = 256) {
		ctx.save();

		const left = this.padding.left;
		const right = width - this.padding.right;
		const bottom = height - this.padding.bottom;
		const drawableHeight = bottom - this.padding.top;

		// --- Sample PDFs per series ---
		const curves = this.series.map((s) => {
			const pdf = s.pdf("x");

			const points = [];
			for (let i = 0; i < sampleCount; i++) {
				const t = i / (sampleCount - 1);
				const x = bounds.minX + t * (bounds.maxX - bounds.minX);
				const y = pdf(x);
				points.push({ x, y });
			}
			return points;
		});

		// --- Global Y scale ---
		const maxDensity = Math.max(
			...curves.flatMap((c) => c.map((p) => p.y)),
		);

		// --- Draw curves ---
		for (let i = 0; i < curves.length; i++) {
			const curve = curves[i];

			ctx.strokeStyle = this.seriesColors[i];
			ctx.lineWidth = this.lineThickness;
			ctx.globalAlpha = 0.5;

			ctx.beginPath();
			for (let j = 0; j < curve.length; j++) {
				const px =
					left +
					((curve[j].x - bounds.minX) / (bounds.maxX - bounds.minX)) *
						(right - left);

				const py = bottom - (curve[j].y / maxDensity) * drawableHeight;

				if (j === 0) {
					ctx.moveTo(px, py);
				} else {
					ctx.lineTo(px, py);
				}
			}
			ctx.stroke();
		}

		ctx.restore();
	}
}

export { DensityPlot };
