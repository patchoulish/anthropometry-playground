import { PlotComponent } from "./plot-component.js";
import { ScatterPlot } from "../../plots/scatter-plot.js";
import {
	buildJointSeries,
	getUnitAbbreviationForMeasurement,
} from "../../data-utils.js";
import { getThemePreference } from "../../theme-toggle.js";

export class ScatterPlotComponent extends PlotComponent {
	/**
	 * @param {HTMLCanvasElement} element
	 * @param {Object} options
	 * @param {string} options.measurementXName
	 * @param {string} options.measurementYName
	 * @param {string} options.measurementValueXName
	 * @param {string} options.measurementValueYName
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
		const measurementYId =
			document.querySelector(
				`details[data-measurement-dropdown][name='${this.options.measurementYName}'] input[type=radio]:checked`,
			)?.value ?? "weightkg";

		const measurementX = dataset
			.measurements()
			.find((m) => m.id === measurementXId);
		const measurementY = dataset
			.measurements()
			.find((m) => m.id === measurementYId);

		if (!measurementX || !measurementY) return;

		this.resize();

		const seriesData = buildJointSeries(
			measurementX,
			measurementY,
			dataset,
			preferences,
		);

		const valueXInput = document.querySelector(
			`input[name='${this.options.measurementValueXName}']`,
		);
		const valueYInput = document.querySelector(
			`input[name='${this.options.measurementValueYName}']`,
		);

		const valueX = valueXInput?.value
			? parseFloat(valueXInput.value)
			: undefined;
		const valueY = valueYInput?.value
			? parseFloat(valueYInput.value)
			: undefined;

		const plot = new ScatterPlot(
			seriesData.series,
			seriesData.seriesColors,
			seriesData.seriesLabels,
			3, // pointRadius? check constructor
			{ x: valueX, y: valueY },
			{ top: 20, right: 20, bottom: 40, left: 50 },
			`${measurementX.name} (${getUnitAbbreviationForMeasurement(
				measurementX.id,
				dataset,
				preferences,
			)})`,
			`${measurementY.name} (${getUnitAbbreviationForMeasurement(
				measurementY.id,
				dataset,
				preferences,
			)})`,
			getThemePreference() === "dark",
		);

		plot.render(this.element);
	}
}
