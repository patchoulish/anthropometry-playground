import { Series } from "./math.js";
import { HistogramPlot } from "./plots/histogram-plot.js";
import { DensityPlot } from "./plots/density-plot.js";
import { ScatterPlot } from "./plots/scatter-plot.js";
import { JointDensityPlot } from "./plots/joint-density-plot.js";
import { Dataset } from "./dataset.js";
import { Gender } from "./model.js";
import { Preferences } from "./preferences.js";
import { MeasurementComponent } from "./components/controls/measurement.js";

let measurementComponents = [];

const getDataset = async () => {
	const datasetId = preferences.dataset;
	const dataset = Dataset.all().find((ds) => ds.id === datasetId);

	if (!dataset) {
		throw new Error(`Dataset with id "${datasetId}" not found.`);
	}

	await dataset.fetch();

	return dataset;
};

// Removed old persistence logic

const initialize = async () => {
	// Defaults are handled in Preferences class now.

	// Set the preference values in the UI.
	document.querySelector(
		`details[data-preference-dropdown] input[name='dataset'][value='${preferences.dataset}']`,
	).checked = true;
	document.querySelector(
		"details[data-preference-dropdown] input[name='genderMale']",
	).checked = preferences.genders.male;
	document.querySelector(
		"details[data-preference-dropdown] input[name='genderFemale']",
	).checked = preferences.genders.female;
	document.querySelector(
		`details[data-preference-dropdown] input[name='unit'][value='${preferences.unit}']`,
	).checked = true;

	// Load the dataset.
	dataset.value = await getDataset();

	const preferenceDropdownElements = document.querySelectorAll(
		"details[data-preference-dropdown]",
	);
	preferenceDropdownElements.forEach((preferenceDropdownElement) => {
		preferenceDropdownElement.addEventListener("change", (event) => {
			const target = event.target;

			if (!target.matches("input[type=radio], input[type=checkbox]")) {
				return;
			}

			switch (target.name) {
				case "dataset":
					preferences.dataset = target.value;
					handleDatasetChange();
					break;
				case "genderMale":
					preferences.setGender("male", target.checked);
					refreshResults();
					break;
				case "genderFemale":
					preferences.setGender("female", target.checked);
					refreshResults();
					break;
				case "unit":
					const oldUnit = preferences.unit;
					preferences.unit = target.value;
					handleUnitPreferenceChange(target, oldUnit);
					refreshResults();
					break;
			}
		});
	});

	const measurementControlElements = document.querySelectorAll(
		"div[data-measurement-control]",
	);
	measurementComponents = Array.from(measurementControlElements).map(
		(element) => new MeasurementComponent(element),
	);

	document.addEventListener("measurement-change", (event) => {
		const { measurementId, name } = event.detail;

		// Update units
		const component = measurementComponents.find((c) => c.name === name);
		if (component) {
			const unitAbbreviation =
				getUnitAbbreviationForMeasurement(measurementId);
			component.updateUnitLabel(unitAbbreviation);
		}

		refreshResults();
	});

	// Initial population
	measurementComponents.forEach((component) =>
		component.update(dataset.value),
	);

	// Refresh results when measurement value inputs change.
	const measurementValueXHistogramElement = document.querySelector(
		"input[name='measurementValueXHistogram']",
	);
	measurementValueXHistogramElement.addEventListener("input", () => {
		refreshHistogramPlot();
	});

	const measurementValueXScatterElement = document.querySelector(
		"input[name='measurementValueXScatter']",
	);
	measurementValueXScatterElement.addEventListener("input", () => {
		refreshScatterPlot();
	});
	const measurementValueYScatterElement = document.querySelector(
		"input[name='measurementValueYScatter']",
	);
	measurementValueYScatterElement.addEventListener("input", () => {
		refreshScatterPlot();
	});

	const measurementValueXDElement = document.querySelector(
		"input[name='measurementValueXDensity']",
	);
	measurementValueXDElement.addEventListener("input", () => {
		refreshDensityPlot();
	});

	const measurementValueXJointDensityElement = document.querySelector(
		"input[name='measurementValueXJointDensity']",
	);
	measurementValueXJointDensityElement.addEventListener("input", () => {
		refreshJointDensityPlot();
	});
	const measurementValueYJointDensityElement = document.querySelector(
		"input[name='measurementValueYJointDensity']",
	);
	measurementValueYJointDensityElement.addEventListener("input", () => {
		refreshJointDensityPlot();
	});

	const densitySigmaToggleElement = document.querySelector(
		"input[name='densitySigmaToggle']",
	);
	densitySigmaToggleElement.addEventListener("change", () => {
		refreshDensityPlot();
	});

	const jointDensitySigmaToggleElement = document.querySelector(
		"input[name='jointDensitySigmaToggle']",
	);
	jointDensitySigmaToggleElement.addEventListener("change", () => {
		refreshJointDensityPlot();
	});

	refreshResults();
};

const handleDatasetChange = async () => {
	// Load the new dataset
	dataset.value = await getDataset();

	// Reload all measurement dropdowns
	measurementComponents.forEach((component) => {
		component.update(dataset.value);
	});

	// Refresh all plots with the new data
	refreshResults();
};

const handleUnitPreferenceChange = (target, oldUnit) => {
	measurementComponents.forEach((component) => {
		const measurementId = component.measurementId;

		// Update label
		const unitAbbreviation =
			getUnitAbbreviationForMeasurement(measurementId);
		component.updateUnitLabel(unitAbbreviation);

		// Update value if needed
		const measurement = dataset.value
			.measurements()
			.find((m) => m.id === measurementId);

		if (
			measurement &&
			component.inputValue &&
			!isNaN(component.inputValue) &&
			oldUnit
		) {
			const oldUnitSystem = measurement.unit.forSystem[oldUnit];
			const newUnitSystem = measurement.unit.forSystem[preferences.unit];

			if (oldUnitSystem && newUnitSystem) {
				const oldConversionFactor = oldUnitSystem.conversionFactor;
				const newConversionFactor = newUnitSystem.conversionFactor;

				if (
					oldConversionFactor &&
					oldConversionFactor !== 0 &&
					newConversionFactor &&
					newConversionFactor !== 0
				) {
					const newValue =
						component.inputValue *
						(newConversionFactor / oldConversionFactor);
					component.inputValue = newValue.toFixed(2);
				}
			}
		}
	});
};

const getUnitAbbreviationForMeasurement = (measurementId) => {
	const measurement = dataset.value
		.measurements()
		.find((m) => m.id === measurementId);
	if (!measurement) {
		return "";
	}
	return measurement.unit.forSystem[preferences.unit].abbreviation;
};

const resizeCanvasToContainer = (canvas) => {
	if (!canvas) return;

	const dpr = window.devicePixelRatio || 1;

	// Use offsetWidth/offsetHeight to get the current rendered size
	// This forces a layout recalculation and gives us accurate dimensions
	const width = canvas.offsetWidth;
	const height = canvas.offsetHeight;

	// If dimensions are 0, the canvas may not be rendered yet
	if (width === 0 || height === 0) return;

	canvas.width = Math.floor(width * dpr);
	canvas.height = Math.floor(height * dpr);

	const ctx = canvas.getContext("2d");
	ctx.scale(dpr, dpr);
};

const convertValuesForDisplay = (values, measurementId) => {
	const measurement = dataset.value
		.measurements()
		.find((m) => m.id === measurementId);

	return values.map((v) =>
		measurement.unit.convertTo(v, { id: preferences.unit }),
	);
};

const buildSeries = (measurementX) => {
	const series = [];
	const seriesLabels = [];
	const seriesColors = [];

	if (preferences.genders.male) {
		series.push(
			new Series({
				x: convertValuesForDisplay(
					measurementX.valuesFor(Gender.MALE),
					measurementX.id,
				),
			}),
		);
		seriesLabels.push("Male");
		seriesColors.push("#2563eb");
	}

	if (preferences.genders.female) {
		series.push(
			new Series({
				x: convertValuesForDisplay(
					measurementX.valuesFor(Gender.FEMALE),
					measurementX.id,
				),
			}),
		);
		seriesLabels.push("Female");
		seriesColors.push("#db2777");
	}

	return {
		series: series,
		seriesLabels: seriesLabels,
		seriesColors: seriesColors,
	};
};

const buildJointSeries = (measurementX, measurementY) => {
	const series = [];
	const seriesLabels = [];
	const seriesColors = [];

	if (preferences.genders.male) {
		series.push(
			new Series({
				x: convertValuesForDisplay(
					measurementX.valuesFor(Gender.MALE),
					measurementX.id,
				),
				y:
					measurementY === null
						? []
						: convertValuesForDisplay(
								measurementY.valuesFor(Gender.MALE),
								measurementY.id,
							),
			}),
		);
		seriesLabels.push("Male");
		seriesColors.push("#2563eb");
	}

	if (preferences.genders.female) {
		series.push(
			new Series({
				x: convertValuesForDisplay(
					measurementX.valuesFor(Gender.FEMALE),
					measurementX.id,
				),
				y:
					measurementY === null
						? []
						: convertValuesForDisplay(
								measurementY.valuesFor(Gender.FEMALE),
								measurementY.id,
							),
			}),
		);
		seriesLabels.push("Female");
		seriesColors.push("#db2777");
	}

	return {
		series: series,
		seriesLabels: seriesLabels,
		seriesColors: seriesColors,
	};
};

const refreshHistogramPlot = () => {
	const measurementX = dataset.value
		.measurements()
		.find(
			(m) =>
				m.id ===
				(document.querySelector(
					"details[data-measurement-dropdown][name='measurementXHistogram'] input[type=radio]:checked",
				)?.value ?? "stature"),
		);

	// If measurement doesn't exist, skip rendering
	if (!measurementX) {
		return;
	}

	const canvas = document.getElementById("histogram-plot");
	resizeCanvasToContainer(canvas);

	const series = buildSeries(measurementX);
	const plot = new HistogramPlot(
		series.series,
		series.seriesColors,
		series.seriesLabels,
		3,
		{
			x: document.querySelector(
				"input[name='measurementValueXHistogram']",
			).value
				? parseFloat(
						document.querySelector(
							"input[name='measurementValueXHistogram']",
						).value,
					)
				: undefined,
		},
		32,
		{ top: 20, right: 20, bottom: 40, left: 50 },
		`${measurementX.name} (${getUnitAbbreviationForMeasurement(measurementX.id)})`,
		getThemePreference() === "dark",
	);

	plot.render(canvas);
};

const refreshScatterPlot = () => {
	const measurementX = dataset.value
		.measurements()
		.find(
			(m) =>
				m.id ===
				(document.querySelector(
					"details[data-measurement-dropdown][name='measurementXScatter'] input[type=radio]:checked",
				)?.value ?? "stature"),
		);
	const measurementY = dataset.value
		.measurements()
		.find(
			(m) =>
				m.id ===
				(document.querySelector(
					"details[data-measurement-dropdown][name='measurementYScatter'] input[type=radio]:checked",
				)?.value ?? "weightkg"),
		);

	// If measurements don't exist, skip rendering
	if (!measurementX || !measurementY) {
		return;
	}

	const canvas = document.getElementById("scatter-plot");
	resizeCanvasToContainer(canvas);

	const series = buildJointSeries(measurementX, measurementY);
	const plot = new ScatterPlot(
		series.series,
		series.seriesColors,
		series.seriesLabels,
		3,
		{
			x: document.querySelector("input[name='measurementValueXScatter']")
				.value
				? parseFloat(
						document.querySelector(
							"input[name='measurementValueXScatter']",
						).value,
					)
				: undefined,
			y: document.querySelector("input[name='measurementValueYScatter']")
				.value
				? parseFloat(
						document.querySelector(
							"input[name='measurementValueYScatter']",
						).value,
					)
				: undefined,
		},
		{ top: 20, right: 20, bottom: 40, left: 50 },
		`${measurementX.name} (${getUnitAbbreviationForMeasurement(measurementX.id)})`,
		`${measurementY.name} (${getUnitAbbreviationForMeasurement(measurementY.id)})`,
		getThemePreference() === "dark",
	);

	plot.render(canvas);
};

const refreshDensityPlot = () => {
	const measurementX = dataset.value
		.measurements()
		.find(
			(m) =>
				m.id ===
				(document.querySelector(
					"details[data-measurement-dropdown][name='measurementXDensity'] input[type=radio]:checked",
				)?.value ?? "stature"),
		);

	// If measurement doesn't exist, skip rendering
	if (!measurementX) {
		return;
	}

	const canvas = document.getElementById("density-plot");
	resizeCanvasToContainer(canvas);

	const series = buildSeries(measurementX);
	const plot = new DensityPlot(
		series.series,
		series.seriesColors,
		series.seriesLabels,
		3,
		{
			x: document.querySelector("input[name='measurementValueXDensity']")
				.value
				? parseFloat(
						document.querySelector(
							"input[name='measurementValueXDensity']",
						).value,
					)
				: undefined,
		},
		{ top: 20, right: 20, bottom: 40, left: 50 },
		`${measurementX.name} (${getUnitAbbreviationForMeasurement(measurementX.id)})`,
		getThemePreference() === "dark",
		document.querySelector("input[name='densitySigmaToggle']")?.checked ??
			true,
	);

	plot.render(canvas);
};

const refreshJointDensityPlot = () => {
	const measurementX = dataset.value
		.measurements()
		.find(
			(m) =>
				m.id ===
				(document.querySelector(
					"details[data-measurement-dropdown][name='measurementXJointDensity'] input[type=radio]:checked",
				)?.value ?? "stature"),
		);
	const measurementY = dataset.value
		.measurements()
		.find(
			(m) =>
				m.id ===
				(document.querySelector(
					"details[data-measurement-dropdown][name='measurementYJointDensity'] input[type=radio]:checked",
				)?.value ?? "weightkg"),
		);

	// If measurements don't exist, skip rendering
	if (!measurementX || !measurementY) {
		return;
	}

	const canvas = document.getElementById("joint-density-plot");
	resizeCanvasToContainer(canvas);

	const series = buildJointSeries(measurementX, measurementY);
	const plot = new JointDensityPlot(
		series.series,
		series.seriesColors,
		series.seriesLabels,
		{
			x: document.querySelector(
				"input[name='measurementValueXJointDensity']",
			).value
				? parseFloat(
						document.querySelector(
							"input[name='measurementValueXJointDensity']",
						).value,
					)
				: undefined,
			y: document.querySelector(
				"input[name='measurementValueYJointDensity']",
			).value
				? parseFloat(
						document.querySelector(
							"input[name='measurementValueYJointDensity']",
						).value,
					)
				: undefined,
		},
		{ top: 20, right: 20, bottom: 40, left: 50 },
		`${measurementX.name} (${getUnitAbbreviationForMeasurement(measurementX.id)})`,
		`${measurementY.name} (${getUnitAbbreviationForMeasurement(measurementY.id)})`,
		getThemePreference() === "dark",
		document.querySelector("input[name='jointDensitySigmaToggle']")
			?.checked ?? true,
	);

	plot.render(canvas);
};

const refreshResults = () => {
	refreshHistogramPlot();
	refreshScatterPlot();
	refreshDensityPlot();
	refreshJointDensityPlot();
};

const preferences = new Preferences();

const dataset = {
	value: null,
};

// Debounce utility function to limit how often a function is called
const debounce = (func, delay) => {
	let timeoutId;
	return (...args) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => func(...args), delay);
	};
};

window.addEventListener("DOMContentLoaded", initialize);
window.addEventListener(
	"resize",
	debounce(() => {
		refreshResults();
	}, 16.67),
);
window.addEventListener("themechange", () => {
	refreshResults();
});
