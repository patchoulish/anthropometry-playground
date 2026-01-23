import { Plot } from "./plot.js";

/**
 * A plot that displays data as points on a Cartesian plane.
 * @extends Plot
 */
class ScatterPlot extends Plot {
	/**
	 * Creates a new ScatterPlot.
	 * @param {import("../math.js").Series[]} series - The data series to plot.
	 * @param {string[]} seriesColors - Colors for each series.
	 * @param {string[]} seriesLabels - Labels for each series.
	 * @param {number} [pointRadius=3] - Radius of the points.
	 * @param {Object} [pointOfInterest={ x: undefined, y: undefined }] - An optional point to highlight.
	 * @param {Object} [padding] - Padding around the plot.
	 * @param {string} [xLabel=""] - Label for the X axis.
	 * @param {string} [yLabel=""] - Label for the Y axis.
	 * @param {boolean} [darkMode=false] - Whether to render in dark mode.
	 */
	constructor(
		series,
		seriesColors,
		seriesLabels,
		pointRadius = 3,
		pointOfInterest = { x: undefined, y: undefined },
		padding = { top: 20, right: 20, bottom: 20, left: 20 },
		xLabel = "",
		yLabel = "",
		darkMode = false,
	) {
		super(padding, darkMode);

		this.series = series;
		this.seriesColors = seriesColors;
		this.seriesLabels = seriesLabels;
		this.pointRadius = pointRadius;
		this.pointOfInterest = pointOfInterest;
		this.xLabel = xLabel;
		this.yLabel = yLabel;
	}

	/**
	 * Renders the scatter plot.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 * @param {number} width - The logical width of the canvas.
	 * @param {number} height - The logical height of the canvas.
	 */
	handleRender(ctx, width, height) {
		const bounds = this.calculateBounds();

		// Clip and draw chart elements
		ctx.save();
		this.clipChartArea(ctx, width, height);

		this.drawPoints(ctx, width, height, bounds);
		ctx.restore();

		// Draw axes and labels on top, outside the clip region
		this.drawAxes(ctx, width, height, bounds);
	}

	/**
	 * Calculates the data bounds (min/max X and Y).
	 * @returns {{minX: number, maxX: number, minY: number, maxY: number}} The bounds.
	 */
	calculateBounds() {
		const xs = this.series.flatMap((s) => s.valuesOf("x"));
		const ys = this.series.flatMap((s) => s.valuesOf("y"));

		return {
			minX: Math.min(...xs),
			maxX: Math.max(...xs),
			minY: Math.min(...ys),
			maxY: Math.max(...ys),
		};
	}

	/**
	 * Projects a data point to canvas coordinates.
	 * @param {number} x - The X value.
	 * @param {number} y - The Y value.
	 * @param {number} width - The logical width of the canvas.
	 * @param {number} height - The logical height of the canvas.
	 * @param {Object} bounds - The data bounds.
	 * @returns {[number, number]} The [x, y] coordinates on the canvas.
	 */
	calculatePointProjection(x, y, width, height, bounds) {
		const px =
			this.padding.left +
			((x - bounds.minX) / (bounds.maxX - bounds.minX)) *
				(width - this.padding.left - this.padding.right);

		const py =
			height -
			this.padding.bottom -
			((y - bounds.minY) / (bounds.maxY - bounds.minY)) *
				(height - this.padding.top - this.padding.bottom);

		return [px, py];
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
		const top = this.padding.top;
		const bottom = height - this.padding.bottom;

		this.drawXAxisLine(ctx, left, right, bottom);
		this.drawYAxisLine(ctx, left, top, bottom);

		this.drawXAxisTicks(ctx, left, right, bottom, bounds);
		this.drawYAxisTicks(ctx, left, top, bottom, bounds);

		this.drawXAxisLabel(ctx, width, height, this.xLabel);
		this.drawYAxisLabel(ctx, width, height, this.yLabel);
	}

	/**
	 * Draws the data points.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 * @param {number} width - Width of the plot.
	 * @param {number} height - Height of the plot.
	 * @param {Object} bounds - Data bounds.
	 */
	drawPoints(ctx, width, height, bounds) {
		ctx.save();

		for (let i = 0; i < this.series.length; i++) {
			const series = this.series[i];
			const xs = series.valuesOf("x");
			const ys = series.valuesOf("y");

			ctx.fillStyle = this.seriesColors[i];
			ctx.globalAlpha = 0.5;

			for (let j = 0; j < xs.length; j++) {
				const [px, py] = this.calculatePointProjection(
					xs[j],
					ys[j],
					width,
					height,
					bounds,
				);

				ctx.beginPath();
				ctx.arc(px, py, this.pointRadius, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		// Draw point of interest if defined.
		if (
			this.pointOfInterest.x !== undefined &&
			this.pointOfInterest.y !== undefined
		) {
			ctx.fillStyle = this.darkMode ? "#FFFFFF" : "#000000";
			ctx.globalAlpha = 1.0;

			const [poix, poiy] = this.calculatePointProjection(
				this.pointOfInterest.x,
				this.pointOfInterest.y,
				width,
				height,
				bounds,
			);

			ctx.beginPath();
			ctx.arc(poix, poiy, this.pointRadius + 2, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.restore();
	}
}

export { ScatterPlot };
