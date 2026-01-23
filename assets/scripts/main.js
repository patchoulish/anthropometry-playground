import { Series } from "./math.js";
import { HistogramPlot } from "./plots/histogram-plot.js";
import { DensityPlot } from "./plots/density-plot.js";
import { ScatterPlot } from "./plots/scatter-plot.js";
import { Dataset } from "./dataset.js";
import { Gender } from "./model.js";

const getDataset = async () => {
	const datasetId = preferences.value.dataset;
	const dataset = Dataset.all().find((ds) => ds.id === datasetId);

	if (!dataset) {
		throw new Error(`Dataset with id "${datasetId}" not found.`);
	}

	await dataset.fetch();

	return dataset;
};

const preferencesStorageKey = "preferences";

const getPreferences = () => {
	const storedPreferences = localStorage.getItem(preferencesStorageKey);

	if (storedPreferences) {
		return JSON.parse(storedPreferences);
	} else {
		return {
			dataset: "ansur2",
			genders: {
				male: true,
				female: true,
			},
			unit: "metric",
		};
	}
};

const setPreferences = () => {
	localStorage.setItem(
		preferencesStorageKey,
		JSON.stringify(preferences.value),
	);
};

const initialize = async () => {
	if (!preferences.value.dataset) {
		// Default to ANSUR II dataset.
		preferences.value.dataset = "ansur2";
	}

	// Set the preference values in the UI.
	document.querySelector(
		`details[data-preference-dropdown] input[name='dataset'][value='${preferences.value.dataset}']`,
	).checked = true;
	document.querySelector(
		"details[data-preference-dropdown] input[name='genderMale']",
	).checked = preferences.value.genders.male;
	document.querySelector(
		"details[data-preference-dropdown] input[name='genderFemale']",
	).checked = preferences.value.genders.female;
	document.querySelector(
		`details[data-preference-dropdown] input[name='unit'][value='${preferences.value.unit}']`,
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
					preferences.value.dataset = target.value;
					setPreferences();
					handleDatasetChange();
					break;
				case "genderMale":
					preferences.value.genders.male = target.checked;
					setPreferences();
					refreshResults();
					break;
				case "genderFemale":
					preferences.value.genders.female = target.checked;
					setPreferences();
					refreshResults();
					break;
				case "unit":
					const oldUnit = preferences.value.unit;
					preferences.value.unit = target.value;
					setPreferences();
					handleUnitPreferenceChange(target, oldUnit);
					refreshResults();
					break;
			}
		});
	});

	const measurementDropdownElements = document.querySelectorAll(
		"details[data-measurement-dropdown]",
	);
	measurementDropdownElements.forEach(initializeMeasurementDropdown);

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

	refreshResults();
};

const initializeMeasurementDropdown = (measurementDropdownElement) => {
	const measurementDropdownElementName =
		measurementDropdownElement.getAttribute("name");

	if (!measurementDropdownElementName) {
		return;
	}

	const list = measurementDropdownElement.querySelector("ul");

	if (!list) {
		return;
	}

	// Populate the dropdown with measurement options.
	const measurements = getMeasurements();

	measurements.forEach((measurement) => {
		const li = document.createElement("li");
		const label = document.createElement("label");
		const input = document.createElement("input");

		input.type = "radio";
		input.name = measurementDropdownElementName;
		input.value = measurement.value;
		if (
			measurement.value ===
			measurementDropdownElement.getAttribute(
				"data-measurement-dropdown-default",
			)
		) {
			input.checked = true;
		}

		label.append(input, document.createTextNode(`${measurement.label}`));
		li.appendChild(label);
		list.appendChild(li);
	});

	const measurementUnitElements = document.querySelectorAll(
		`button[data-unit-for="${measurementDropdownElementName}"]`,
	);

	measurementDropdownElement.addEventListener("input", (event) => {
		const target = event.target;

		if (target.matches("input[type=search")) {
			handleMeasurementDropdownSearchInput(
				target,
				measurementDropdownElement,
			);
		}
	});

	measurementDropdownElement.addEventListener("change", (event) => {
		const target = event.target;

		if (target.matches("input[type=radio]")) {
			handleMeasurementDropdownOptionChange(
				target,
				measurementDropdownElement,
				measurementUnitElements,
			);
		}
	});

	const measurementDropdownCheckedOptionElement =
		measurementDropdownElement.querySelector("input[type=radio]:checked");

	if (measurementDropdownCheckedOptionElement) {
		handleMeasurementDropdownOptionChange(
			measurementDropdownCheckedOptionElement,
			measurementDropdownElement,
			measurementUnitElements,
		);
	}
};

const reloadMeasurementDropdown = (measurementDropdownElement) => {
	const measurementDropdownElementName =
		measurementDropdownElement.getAttribute("name");

	if (!measurementDropdownElementName) {
		return;
	}

	const list = measurementDropdownElement.querySelector("ul");

	if (!list) {
		return;
	}

	// Get currently selected measurement before clearing
	const currentlySelectedElement = measurementDropdownElement.querySelector(
		"input[type=radio]:checked",
	);
	const currentlySelectedValue = currentlySelectedElement?.value;

	// Clear existing measurement options (keep search input)
	const searchInput = list.querySelector("input[type=search]");
	list.innerHTML = "";
	if (searchInput) {
		const li = document.createElement("li");
		li.appendChild(searchInput);
		list.appendChild(li);
		searchInput.value = ""; // Clear search
	}

	// Populate the dropdown with new measurement options
	const measurements = getMeasurements();
	const defaultValue = measurementDropdownElement.getAttribute(
		"data-measurement-dropdown-default",
	);

	let selectedValue = null;
	// Check if currently selected measurement exists in new dataset
	const currentExistsInNew =
		currentlySelectedValue &&
		measurements.some((m) => m.value === currentlySelectedValue);

	if (currentExistsInNew) {
		// Keep current selection if it exists in new dataset
		selectedValue = currentlySelectedValue;
	} else if (measurements.some((m) => m.value === defaultValue)) {
		// Fall back to default if it exists
		selectedValue = defaultValue;
	} else if (measurements.length > 0) {
		// Otherwise use first measurement
		selectedValue = measurements[0].value;
	}

	measurements.forEach((measurement) => {
		const li = document.createElement("li");
		const label = document.createElement("label");
		const input = document.createElement("input");

		input.type = "radio";
		input.name = measurementDropdownElementName;
		input.value = measurement.value;

		if (measurement.value === selectedValue) {
			input.checked = true;
		}

		label.append(input, document.createTextNode(`${measurement.label}`));
		li.appendChild(label);
		list.appendChild(li);
	});

	// Update summary and units
	const measurementUnitElements = document.querySelectorAll(
		`button[data-unit-for="${measurementDropdownElementName}"]`,
	);

	const measurementDropdownCheckedOptionElement =
		measurementDropdownElement.querySelector("input[type=radio]:checked");

	if (measurementDropdownCheckedOptionElement) {
		handleMeasurementDropdownOptionChange(
			measurementDropdownCheckedOptionElement,
			measurementDropdownElement,
			measurementUnitElements,
		);
	} else {
		// Reset summary if no option selected
		const summaryElement =
			measurementDropdownElement.querySelector("summary");
		if (summaryElement) {
			summaryElement.textContent = "Measurement";
		}
	}

	// Only clear measurement value input if the measurement changed
	if (!currentExistsInNew) {
		const inputName = measurementDropdownElementName.replace(
			"measurement",
			"measurementValue",
		);
		const measurementInputElement = document.querySelector(
			`input[data-measurement-value][name="${inputName}"]`,
		);
		if (measurementInputElement) {
			measurementInputElement.value = "";
		}
	}
};

const handleMeasurementDropdownSearchInput = (
	target,
	measurementDropdownElement,
) => {
	const inputText = target.value;

	const optionLabelElements =
		measurementDropdownElement.querySelectorAll("label");

	if (!optionLabelElements) {
		return;
	}

	optionLabelElements.forEach((element) => {
		if (
			!element.innerText.toLowerCase().includes(inputText.toLowerCase())
		) {
			element.parentElement.setAttribute("hidden", "true");
		} else {
			element.parentElement.removeAttribute("hidden");
		}
	});
};

const handleMeasurementDropdownOptionChange = (
	target,
	measurementDropdownElement,
	measurementUnitElements,
) => {
	const measurementName = target.value;
	const measurementLabel = target.parentElement.textContent.trim();

	const summaryElement = measurementDropdownElement.querySelector("summary");
	if (summaryElement) {
		summaryElement.textContent = measurementLabel;
	}

	if (measurementUnitElements) {
		measurementUnitElements.forEach((element) => {
			element.textContent =
				getUnitAbbreviationForMeasurement(measurementName);
		});
	}

	refreshResults();
};

const handleDatasetChange = async () => {
	// Load the new dataset
	dataset.value = await getDataset();

	// Reload all measurement dropdowns
	const measurementDropdownElements = document.querySelectorAll(
		"details[data-measurement-dropdown]",
	);
	measurementDropdownElements.forEach(reloadMeasurementDropdown);

	// Refresh all plots with the new data
	refreshResults();
};

const handleUnitPreferenceChange = (target, oldUnit) => {
	document
		.querySelectorAll("button[data-unit-for]")
		.forEach((measurementUnitElement) => {
			const measurementDropdownElement = document.querySelector(
				`details[data-measurement-dropdown][name="${measurementUnitElement.getAttribute("data-unit-for")}"]`,
			);

			if (!measurementDropdownElement) {
				return;
			}

			const measurementDropdownCheckedOptionElement =
				measurementDropdownElement.querySelector(
					"input[type=radio]:checked",
				);

			if (measurementDropdownCheckedOptionElement) {
				handleMeasurementDropdownOptionChange(
					measurementDropdownCheckedOptionElement,
					measurementDropdownElement,
					[measurementUnitElement],
				);

				// Convert the user input value from old unit to new unit
				const dropdownName =
					measurementUnitElement.getAttribute("data-unit-for");
				const inputName = dropdownName.replace(
					"measurement",
					"measurementValue",
				);
				const measurementInputElement = document.querySelector(
					`input[data-measurement-value][name="${inputName}"]`,
				);

				if (
					measurementInputElement &&
					measurementInputElement.value &&
					oldUnit &&
					inputName !== dropdownName // Ensure replacement occurred
				) {
					const measurementId =
						measurementDropdownCheckedOptionElement.value;
					const measurement = dataset.value
						.measurements()
						.find((m) => m.id === measurementId);

					if (measurement) {
						const currentValue = parseFloat(
							measurementInputElement.value,
						);

						// Validate that the current value is a valid number
						if (isNaN(currentValue)) {
							return;
						}

						const oldUnitSystem =
							measurement.unit.forSystem[oldUnit];
						const newUnitSystem =
							measurement.unit.forSystem[preferences.value.unit];

						// Validate that both unit systems exist
						if (!oldUnitSystem || !newUnitSystem) {
							return;
						}

						const oldConversionFactor =
							oldUnitSystem.conversionFactor;
						const newConversionFactor =
							newUnitSystem.conversionFactor;

						// Validate conversion factors to prevent division by zero
						if (
							!oldConversionFactor ||
							oldConversionFactor === 0 ||
							!newConversionFactor ||
							newConversionFactor === 0
						) {
							return;
						}

						const newValue =
							currentValue *
							(newConversionFactor / oldConversionFactor);
						measurementInputElement.value = newValue.toFixed(2);
					}
				}
			}
		});
};

const getMeasurements = () => {
	return dataset.value.measurements().map((measurement) => {
		return {
			label: measurement.name,
			value: measurement.id,
		};
	});
};

const getUnitAbbreviationForMeasurement = (measurementId) => {
	const measurement = dataset.value
		.measurements()
		.find((m) => m.id === measurementId);
	if (!measurement) {
		return "";
	}
	return measurement.unit.forSystem[preferences.value.unit].abbreviation;
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
		measurement.unit.convertTo(v, { id: preferences.value.unit }),
	);
};

const buildSeries = (measurementX) => {
	const series = [];
	const seriesLabels = [];
	const seriesColors = [];

	if (preferences.value.genders.male) {
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

	if (preferences.value.genders.female) {
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

	if (preferences.value.genders.male) {
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

	if (preferences.value.genders.female) {
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
	);

	plot.render(canvas);
};

const refreshResults = () => {
	refreshHistogramPlot();
	refreshScatterPlot();
	refreshDensityPlot();
};

const preferences = {
	value: getPreferences(),
};

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
