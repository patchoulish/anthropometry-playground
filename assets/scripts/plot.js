import { Series } from "./math.js";

class Plot {
	constructor() {}

	render(canvas) {
		const ctx = canvas.getContext("2d");

		// Clear the canvas.
		ctx.save();
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.restore();

		this.handleRender(ctx, canvas.width, canvas.height);
	}

	handleRender(ctx, width, height) {
		throw new Error("handleRender() not implemented in base Plot class.");
	}
}

class HistogramPlot extends Plot {
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
		super();

		this.series = series;
		this.seriesColors = seriesColors;
		this.seriesLabels = seriesLabels;
		this.lineThickness = lineThickness;
		this.lineOfInterest = lineOfInterest;
		this.padding = padding;
		this.xLabel = xLabel;
		this.darkMode = darkMode;
	}

	handleRender(ctx, width, height) {
		const bounds = this.calculateBounds();

		this.drawAxes(ctx, width, height, bounds);
		// this.drawBars(ctx, width, height, bounds);
		this.drawDensityCurves(ctx, width, height, bounds);
		this.drawLineOfInterest(ctx, width, height, bounds);
	}

	calculateBounds() {
		const xs = this.series.flatMap((s) => s.valuesOf("x"));

		return {
			minX: Math.min(...xs),
			maxX: Math.max(...xs),
		};
	}

	drawAxes(ctx, width, height, bounds) {
		ctx.save();

		ctx.strokeStyle = this.darkMode ? "#FFFFFF" : "#000000";
		ctx.fillStyle = this.darkMode ? "#FFFFFF" : "#000000";
		ctx.lineWidth = 1;
		ctx.font = "12px monospace";

		const left = this.padding.left;
		const right = width - this.padding.right;
		const top = this.padding.top;
		const bottom = height - this.padding.bottom;

		// Draw axis lines.

		// X axis.
		ctx.beginPath();
		ctx.moveTo(left, bottom);
		ctx.lineTo(right, bottom);
		ctx.stroke();

		this.drawAxesXTicks(ctx, left, right, bottom, bounds);

		this.drawAxesLabels(ctx, width, height);

		ctx.restore();
	}

	drawAxesXTicks(ctx, left, right, bottom, bounds, tickCount = 5) {
		for (let i = 0; i <= tickCount; i++) {
			const t = i / tickCount;
			const x = left + t * (right - left);
			const value = bounds.minX + t * (bounds.maxX - bounds.minX);

			// Draw tick line.
			ctx.beginPath();
			ctx.moveTo(x, bottom);
			ctx.lineTo(x, bottom + 5);
			ctx.stroke();

			ctx.textAlign = "center";
			ctx.textBaseline = "top";
			ctx.fillText(value.toFixed(1), x, bottom + 7);
		}
	}

	drawAxesLabels(ctx, width, height) {
		ctx.save();

		ctx.font = "12px monospace";

		// X axis label.
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText(this.xLabel, width / 2, height - this.padding.bottom + 25);

		ctx.restore();
	}

	gaussianKernel(u) {
		return Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
	}

	estimateDensity(xs, x, bandwidth) {
		let sum = 0;
		for (const xi of xs) {
			sum += this.gaussianKernel((x - xi) / bandwidth);
		}
		return sum / (xs.length * bandwidth);
	}

	drawDensityCurves(ctx, width, height, bounds, sampleCount = 256) {
		ctx.save();

		const left = this.padding.left;
		const right = width - this.padding.right;
		const top = this.padding.top;
		const bottom = height - this.padding.bottom;

		const drawableHeight = bottom - top;

		// Precompute density samples per series
		const densities = this.series.map((s) => {
			const xs = s.valuesOf("x");

			// Scott’s Rule bandwidth
			const h = 1.06 * s.stddev("x") * Math.pow(xs.length, -1 / 5);

			const points = [];
			for (let i = 0; i < sampleCount; i++) {
				const t = i / (sampleCount - 1);
				const x = bounds.minX + t * (bounds.maxX - bounds.minX);
				const y = this.estimateDensity(xs, x, h);
				points.push({ x, y });
			}
			return points;
		});

		// Global Y scale
		const maxDensity = Math.max(
			...densities.flatMap((d) => d.map((p) => p.y)),
		);

		// Draw curves
		for (let i = 0; i < densities.length; i++) {
			const curve = densities[i];

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

	drawLineOfInterest(ctx, width, height, bounds) {
		if (this.lineOfInterest.x === undefined) return;

		ctx.save();

		const left = this.padding.left;
		const right = width - this.padding.right;
		const top = this.padding.top;
		const bottom = height - this.padding.bottom;

		const px =
			left +
			((this.lineOfInterest.x - bounds.minX) /
				(bounds.maxX - bounds.minX)) *
				(right - left);

		ctx.strokeStyle = this.darkMode ? "#FFFFFF" : "#000000";
		ctx.lineWidth = 1;

		ctx.beginPath();
		ctx.moveTo(px, top);
		ctx.lineTo(px, bottom);
		ctx.stroke();

		ctx.restore();
	}
}

class ScatterPlot extends Plot {
	constructor(
		series,
		seriesColors,
		seriesLabels,
		pointRadius = 3,
		pointOfInterest = {
			x: undefined,
			y: undefined,
		},
		padding = { top: 20, right: 20, bottom: 20, left: 20 },
		xLabel = "",
		yLabel = "",
		darkMode = false,
	) {
		super();

		this.series = series;
		this.seriesColors = seriesColors;
		this.seriesLabels = seriesLabels;
		this.pointRadius = pointRadius;
		this.pointOfInterest = pointOfInterest;
		this.padding = padding;
		this.xLabel = xLabel;
		this.yLabel = yLabel;
		this.darkMode = darkMode;
	}

	handleRender(ctx, width, height) {
		const bounds = this.calculateBounds();

		this.drawAxes(ctx, width, height, bounds);
		this.drawPoints(ctx, width, height, bounds);
	}

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

	drawAxes(ctx, width, height, bounds) {
		ctx.save();

		ctx.strokeStyle = this.darkMode ? "#FFFFFF" : "#000000";
		ctx.fillStyle = this.darkMode ? "#FFFFFF" : "#000000";
		ctx.lineWidth = 1;
		ctx.font = "12px monospace";

		const left = this.padding.left;
		const right = width - this.padding.right;
		const top = this.padding.top;
		const bottom = height - this.padding.bottom;

		// Draw axis lines.

		// X axis.
		ctx.beginPath();
		ctx.moveTo(left, bottom);
		ctx.lineTo(right, bottom);
		ctx.stroke();

		// Y axis.
		ctx.beginPath();
		ctx.moveTo(left, top);
		ctx.lineTo(left, bottom);
		ctx.stroke();

		this.drawAxesXTicks(ctx, left, right, bottom, bounds);
		this.drawAxesYTicks(ctx, left, top, bottom, bounds);

		this.drawAxesLabels(ctx, width, height);

		ctx.restore();
	}

	drawAxesXTicks(ctx, left, right, bottom, bounds, tickCount = 5) {
		for (let i = 0; i <= tickCount; i++) {
			const t = i / tickCount;
			const x = left + t * (right - left);
			const value = bounds.minX + t * (bounds.maxX - bounds.minX);

			// Draw tick line.
			ctx.beginPath();
			ctx.moveTo(x, bottom);
			ctx.lineTo(x, bottom + 5);
			ctx.stroke();

			ctx.textAlign = "center";
			ctx.textBaseline = "top";
			ctx.fillText(value.toFixed(1), x, bottom + 7);
		}
	}

	drawAxesYTicks(ctx, left, top, bottom, bounds, tickCount = 5) {
		for (let i = 0; i <= tickCount; i++) {
			const t = i / tickCount;
			const y = bottom - t * (bottom - top);
			const value = bounds.minY + t * (bounds.maxY - bounds.minY);

			// Draw tick line.
			ctx.beginPath();
			ctx.moveTo(left, y);
			ctx.lineTo(left - 5, y);
			ctx.stroke();

			ctx.textAlign = "right";
			ctx.textBaseline = "middle";
			ctx.fillText(value.toFixed(1), left - 7, y);
		}
	}

	drawAxesLabels(ctx, width, height) {
		ctx.save();

		ctx.font = "12px monospace";

		// X axis label.
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText(this.xLabel, width / 2, height - this.padding.bottom + 25);

		// Y axis label.
		ctx.translate(15, height / 2);
		ctx.rotate(-Math.PI / 2);
		ctx.textAlign = "center";
		ctx.textBaseline = "top";
		ctx.fillText(this.yLabel, 0, 0);

		ctx.restore();
	}

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

export { Plot, HistogramPlot, ScatterPlot };
