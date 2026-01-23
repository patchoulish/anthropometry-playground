import { Component } from "../component.js";

/**
 * Base class for plot components.
 * Handles canvas resizing and common plot initialization.
 */
export class PlotComponent extends Component {
	/**
	 * Creates a new PlotComponent instance.
	 * @param {HTMLCanvasElement} element - The canvas element.
	 */
	constructor(element) {
		super(element);
	}

	/**
	 * Resizes the canvas to match its display size, accounting for DPR.
	 */
	resize() {
		const canvas = this.element;
		if (!canvas) return;

		const dpr = window.devicePixelRatio || 1;

		// Use offsetWidth/offsetHeight to get the current rendered size
		const width = canvas.offsetWidth;
		const height = canvas.offsetHeight;

		// If dimensions are 0, the canvas may not be rendered yet
		if (width === 0 || height === 0) return;

		// Set the actual size in memory (scaled to account for extra pixel density)
		canvas.width = Math.floor(width * dpr);
		canvas.height = Math.floor(height * dpr);

		// Normalize coordinate system to use css pixels.
		const ctx = canvas.getContext("2d");
		ctx.scale(dpr, dpr);
	}

	/**
	 * Renders the plot.
	 * @param {import("../../dataset.js").Dataset} dataset - The dataset to visualize.
	 * @param {import("../../preferences.js").Preferences} preferences - User preferences.
	 */
	render(dataset, preferences) {
		throw new Error("render() must be implemented by subclass");
	}
}
