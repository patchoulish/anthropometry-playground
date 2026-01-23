import {
	EventName,
	DatasetChangedEventData,
	GenderChangedEventData,
	UnitSystemChangedEventData,
} from "./events.js";
import { Dataset } from "./dataset.js";
import { Preferences } from "./preferences.js";

// UI Components
import { MeasurementComponent } from "./components/controls/measurement.js";
import { SwitchComponent } from "./components/controls/switch.js";
import { HistogramPlotComponent } from "./components/plots/histogram-plot-component.js";
import { DensityPlotComponent } from "./components/plots/density-plot-component.js";
import { ScatterPlotComponent } from "./components/plots/scatter-plot-component.js";
import { JointDensityPlotComponent } from "./components/plots/joint-density-plot-component.js";

/** @type {MeasurementComponent[]} List of measurement control components */
let measurementComponents = [];
/** @type {SwitchComponent[]} List of switch components */
let switchComponents = [];
/** @type {import("./components/plots/plot-component.js").PlotComponent[]} */
let plotComponents = [];

const preferences = new Preferences();

const dataset = {
	value: null,
};

/**
 * Retrieves the currently selected dataset based on preferences.
 * Fetches the data if it hasn't been loaded yet.
 * @returns {Promise<Dataset>} The loaded dataset.
 * @throws {Error} If the dataset ID in preferences is invalid.
 */
const getDataset = async () => {
	const datasetId = preferences.dataset;
	const dataset = Dataset.all().find((ds) => ds.id === datasetId);

	if (!dataset) {
		throw new Error(`Dataset with id "${datasetId}" not found.`);
	}

	await dataset.fetch();

	return dataset;
};

// Debounce utility function to limit how often a function is called
const debounce = (func, delay) => {
	let timeoutId;
	return (...args) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => func(...args), delay);
	};
};

const refreshResults = () => {
	if (!dataset.value) return;

	plotComponents.forEach((component) => {
		component.render(dataset.value, preferences);
	});
};

const refreshResultsDebounced = debounce(refreshResults, 16.67);

const handleDatasetChange = async () => {
	// Load the new dataset
	dataset.value = await getDataset();

	// Update components
	measurementComponents.forEach((component) =>
		component.update(dataset.value, preferences.unit),
	);

	window.dispatchEvent(
		new CustomEvent(EventName.DATASET_CHANGED, {
			detail: new DatasetChangedEventData(
				dataset.value,
				preferences.unit,
			),
		}),
	);
};

/**
 * Initializes the application.
 * Sets up initial state, event listeners, and default values.
 */
const initialize = async () => {
	// Sync UI state with stored preferences
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

	// Load the initial dataset.
	dataset.value = await getDataset();

	// Set up preference dropdown interactions
	const preferenceDropdownElements = document.querySelectorAll(
		"details[data-preference-dropdown]",
	);
	preferenceDropdownElements.forEach((preferenceDropdownElement) => {
		preferenceDropdownElement.addEventListener("change", (event) => {
			const target = event.target;

			if (!target.matches("input[type=radio], input[type=checkbox]")) {
				return;
			}

			// Handle preference changes based on the input name
			switch (target.name) {
				case "dataset":
					preferences.dataset = target.value;
					handleDatasetChange();
					break;
				case "genderMale":
					preferences.setGender("male", target.checked);
					// Notify app of gender preference change
					window.dispatchEvent(
						new CustomEvent(EventName.GENDER_CHANGED, {
							detail: new GenderChangedEventData(
								preferences.genders,
							),
						}),
					);
					break;
				case "genderFemale":
					preferences.setGender("female", target.checked);
					window.dispatchEvent(
						new CustomEvent(EventName.GENDER_CHANGED, {
							detail: new GenderChangedEventData(
								preferences.genders,
							),
						}),
					);
					break;
				case "unit":
					const oldUnit = preferences.unit;
					preferences.unit = target.value;
					// Notify app of unit system change (triggers conversion)
					window.dispatchEvent(
						new CustomEvent(EventName.UNIT_SYSTEM_CHANGED, {
							detail: new UnitSystemChangedEventData(
								preferences.unit,
								oldUnit,
							),
						}),
					);
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

	const switchControlElements = document.querySelectorAll(
		"fieldset[data-switch-control]",
	);
	switchComponents = Array.from(switchControlElements).map(
		(element) => new SwitchComponent(element),
	);

	// Initialize Plot Components
	plotComponents = [
		new HistogramPlotComponent(document.getElementById("histogram-plot"), {
			measurementXName: "measurementXHistogram",
			measurementValueXName: "measurementValueXHistogram",
		}),
		new ScatterPlotComponent(document.getElementById("scatter-plot"), {
			measurementXName: "measurementXScatter",
			measurementYName: "measurementYScatter",
			measurementValueXName: "measurementValueXScatter",
			measurementValueYName: "measurementValueYScatter",
		}),
		new DensityPlotComponent(document.getElementById("density-plot"), {
			measurementXName: "measurementXDensity",
			measurementValueXName: "measurementValueXDensity",
			sigmaToggleName: "densitySigmaToggle",
		}),
		new JointDensityPlotComponent(
			document.getElementById("joint-density-plot"),
			{
				measurementXName: "measurementXJointDensity",
				measurementYName: "measurementYJointDensity",
				measurementValueXName: "measurementValueXJointDensity",
				measurementValueYName: "measurementValueYJointDensity",
				sigmaToggleName: "jointDensitySigmaToggle",
			},
		),
	];

	document.addEventListener("measurement-change", () => {
		refreshResults();
	});

	// Initial population of measurement controls
	measurementComponents.forEach((component) =>
		component.update(dataset.value, preferences.unit),
	);

	// Listen for input changes that should trigger plot updates (values, toggles)
	document.addEventListener("input", (e) => {
		if (
			e.target.matches("input") &&
			(e.target.name.includes("measurementValue") ||
				e.target.name.includes("Toggle"))
		) {
			refreshResultsDebounced();
		}
	});

	document.addEventListener("change", (e) => {
		if (
			e.target.matches("input[type=checkbox]") &&
			e.target.name.includes("Toggle")
		) {
			refreshResultsDebounced();
		}
	});

	refreshResults();
};

window.addEventListener("DOMContentLoaded", initialize);
window.addEventListener("resize", refreshResultsDebounced);
window.addEventListener(EventName.THEME_CHANGED, refreshResults);
window.addEventListener(EventName.DATASET_CHANGED, refreshResults);
window.addEventListener(EventName.GENDER_CHANGED, refreshResults);
window.addEventListener(EventName.UNIT_SYSTEM_CHANGED, refreshResults);
