import { PlotComponent } from "./plot-component.js";
import { DensityPlot } from "../../plots/density-plot.js";
import {
	buildSeries,
	getUnitAbbreviationForMeasurement,
} from "../../data-utils.js";
import { getThemePreference } from "../../theme-toggle.js";

export class DensityPlotComponent extends PlotComponent {
	/**
	 * @param {HTMLCanvasElement} element
	 * @param {Object} options
	 * @param {string} options.measurementXName
	 * @param {string} options.measurementValueXName
	 * @param {string} options.sigmaToggleName
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

		const sigmaToggleInfo = document.querySelector(
			`input[name='${this.options.sigmaToggleName}']`,
		);
		const showSigma = sigmaToggleInfo ? sigmaToggleInfo.checked : true;

		const plot = new DensityPlot(
			seriesData.series,
			seriesData.seriesColors,
			seriesData.seriesLabels,
			3, // lineThickness
			{ x: valueX },
			{ top: 20, right: 20, bottom: 40, left: 50 },
			`${measurementX.name} (${getUnitAbbreviationForMeasurement(
				measurementX.id,
				dataset,
				preferences,
			)})`,
			getThemePreference() === "dark",
			showSigma,
		);

		plot.render(this.element);
	}
}
