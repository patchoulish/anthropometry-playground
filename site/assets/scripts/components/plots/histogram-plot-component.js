import { PlotComponent } from "./plot-component.js";
import { HistogramPlot } from "../../plots/histogram-plot.js";
import {
	buildSeries,
	getUnitAbbreviationForMeasurement,
} from "../../data-utils.js";
import { getThemePreference } from "../../theme-toggle.js";

export class HistogramPlotComponent extends PlotComponent {
	/**
	 * @param {HTMLCanvasElement} element
	 * @param {Object} options
	 * @param {string} options.measurementXName - Name of the input group for X axis measurement.
	 * @param {string} options.measurementValueXName - Name of the input for X axis value.
	 */
	constructor(element, options) {
		super(element);
		this.options = options;
	}

	render(dataset, preferences) {
		const measurementXId =
			document.querySelector(
				`details[data-measurement-dropdown][name='${this.options.measurementXName}'] input[type=radio]:checked`,
			)?.value ?? "stature";

		const measurementX = dataset
			.measurements()
			.find((m) => m.id === measurementXId);

		if (!measurementX) return;

		this.resize();

		const seriesData = buildSeries(measurementX, dataset, preferences);
		const valueXInput = document.querySelector(
			`input[name='${this.options.measurementValueXName}']`,
		);
		const valueX = valueXInput?.value
			? parseFloat(valueXInput.value)
			: undefined;

		const plot = new HistogramPlot(
			seriesData.series,
			seriesData.seriesColors,
			seriesData.seriesLabels,
			3, // lineThickness
			{ x: valueX }, // lineOfInterest
			32, // binCount
			{ top: 20, right: 20, bottom: 40, left: 50 }, // padding
			`${measurementX.name} (${getUnitAbbreviationForMeasurement(
				measurementX.id,
				dataset,
				preferences,
			)})`,
			getThemePreference() === "dark",
		);

		plot.render(this.element);
	}
}
