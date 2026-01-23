import { Plot } from "./plot.js";

/**
 * A plot that displays the joint distribution of two variables using density estimation.
 * Assumes independence between X and Y dimensions for simplified rendering (P(x,y) ~ P(x)P(y)).
 * @extends Plot
 */
class JointDensityPlot extends Plot {
	/**
	 * Creates a new JointDensityPlot.
	 * @param {import("../math.js").Series[]} series - The data series to plot.
	 * @param {string[]} seriesColors - Colors for each series.
	 * @param {string[]} seriesLabels - Labels for each series.
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
		this.pointOfInterest = pointOfInterest;
		this.xLabel = xLabel;
		this.yLabel = yLabel;
	}

	/**
	 * Renders the joint density plot.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 * @param {number} width - The logical width of the canvas.
	 * @param {number} height - The logical height of the canvas.
	 */
	handleRender(ctx, width, height) {
		const bounds = this.calculateBounds();

		this.drawAxes(ctx, width, height, bounds);
		this.drawDensityHeatmap(ctx, width, height, bounds);
		this.drawPointOfInterest(ctx, width, height, bounds);
	}

	/**
	 * Calculates the data bounds.
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
	 * Draws the density heatmap.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 * @param {number} width - Width of the plot.
	 * @param {number} height - Height of the plot.
	 * @param {Object} bounds - Data bounds.
	 */
	drawDensityHeatmap(ctx, width, height, bounds) {
		ctx.save();

		const left = this.padding.left;
		const right = width - this.padding.right;
		const top = this.padding.top;
		const bottom = height - this.padding.bottom;

		const plotWidth = right - left;
		const plotHeight = bottom - top;

		// Draw contours for each series (1, 2, 3 standard deviations)
		for (let i = 0; i < this.series.length; i++) {
			const s = this.series[i];
			const color = this.seriesColors[i];

			const mx = s.mean("x");
			const my = s.mean("y");
			const sx = s.stddev("x");
			const sy = s.stddev("y");
			const rho = s.correlation("x", "y");

			// Draw 1, 2, and 3 sigma ellipses
			// Based on Mahalanobis distance squared: c^2
			// For Bivariate Normal:
			// 1-sigma: ~39.3% confidence (c=1 is common but actually corresponds to 1 std in 1D sense? No.)
			// Usually "confidence ellipse" for p=0.68, p=0.95.
			// However, in 1D density plots, lines are at +/- 1*std, +/- 2*std.
			// The boundary of the 1-sigma ellipse corresponds to (x-mu)^T Sigma^-1 (x-mu) = 1.
			// This is what is typically called the "standard deviation ellipse".

			ctx.strokeStyle = color;
			ctx.lineWidth = 2;
			ctx.setLineDash([]); // solid line for 1-sigma
			this.drawConfidenceEllipse(
				ctx,
				mx,
				my,
				sx,
				sy,
				rho,
				1,
				width,
				height,
				bounds,
			);

			ctx.setLineDash([4, 4]); // dashed for others
			ctx.lineWidth = 1;
			this.drawConfidenceEllipse(
				ctx,
				mx,
				my,
				sx,
				sy,
				rho,
				2,
				width,
				height,
				bounds,
			);
			this.drawConfidenceEllipse(
				ctx,
				mx,
				my,
				sx,
				sy,
				rho,
				3,
				width,
				height,
				bounds,
			);
		}

		ctx.restore();
	}

	drawConfidenceEllipse(
		ctx,
		mx,
		my,
		sx,
		sy,
		rho,
		scale,
		width,
		height,
		bounds,
	) {
		// Points on the unit circle
		const steps = 100;
		ctx.beginPath();

		for (let i = 0; i <= steps; i++) {
			const theta = (i / steps) * 2 * Math.PI;

			// Parametric equation for bivariate normal ellipse with correlation rho
			// We effectively transform the unit circle by the "square root" (Cholesky) of the covariance matrix.
			// Covariance Matrix Sigma = [[sx^2, rho*sx*sy], [rho*sx*sy, sy^2]]
			// Cholesky L = [[sx, 0], [rho*sy, sy*sqrt(1-rho^2)]]
			// [X, Y]^T = [mx, my]^T + L * [scale*cos(theta), scale*sin(theta)]^T

			const unitX = Math.cos(theta) * scale;
			const unitY = Math.sin(theta) * scale;

			const dx = sx * unitX;
			// Note: The second row of Cholesky multiplication:
			// y_out = rho*sy * unitX + sy*sqrt(1-rho^2) * unitY
			const dy = sy * (rho * unitX + Math.sqrt(1 - rho * rho) * unitY);

			const x = mx + dx;
			const y = my + dy;

			// Project to screen
			const [px, py] = this.calculatePointProjection(
				x,
				y,
				width,
				height,
				bounds,
			);

			if (i === 0) {
				ctx.moveTo(px, py);
			} else {
				ctx.lineTo(px, py);
			}
		}

		ctx.stroke();
	}

	/**
	 * Draws the point of interest.
	 * @param {CanvasRenderingContext2D} ctx - The drawing context.
	 * @param {number} width - Width of the plot.
	 * @param {number} height - Height of the plot.
	 * @param {Object} bounds - Data bounds.
	 */
	drawPointOfInterest(ctx, width, height, bounds) {
		if (
			this.pointOfInterest.x === undefined ||
			this.pointOfInterest.y === undefined
		) {
			return;
		}

		ctx.save();
		ctx.fillStyle = this.darkMode ? "#FFFFFF" : "#000000";

		const [px, py] = this.calculatePointProjection(
			this.pointOfInterest.x,
			this.pointOfInterest.y,
			width,
			height,
			bounds,
		);

		ctx.beginPath();
		ctx.arc(px, py, 5, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
}

export { JointDensityPlot };
