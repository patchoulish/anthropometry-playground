import { Series } from "./math.js";
import { HistogramPlot, ScatterPlot } from "./plot.js";
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
					refreshResults();
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
					preferences.value.unit = target.value;
					setPreferences();
					handleUnitPreferenceChange(target);
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
	const measurementValueXElement = document.querySelector(
		"input[name='measurementValueX']",
	);
	measurementValueXElement.addEventListener("input", () => {
		refreshResults();
	});

	const measurementValueYElement = document.querySelector(
		"input[name='measurementValueY']",
	);
	measurementValueYElement.addEventListener("input", () => {
		refreshResults();
	});

	const measurementValueX2Element = document.querySelector(
		"input[name='measurementValueX2']",
	);
	measurementValueX2Element.addEventListener("input", () => {
		refreshResults();
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

const handleUnitPreferenceChange = (target) => {
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
	return measurement.unit.forSystem[preferences.value.unit].abbreviation;
};

const resizeCanvasToContainer = (canvas) => {
	const canvasSize = canvas.getBoundingClientRect();
	const dpr = window.devicePixelRatio || 1;

	canvas.width = Math.floor(canvasSize.width * dpr);
	canvas.height = Math.floor(canvasSize.height * dpr);

	canvas.style.width = `${canvasSize.width}px`;
	canvas.style.height = `${canvasSize.height}px`;

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

const buildHistogramSeries = (measurementX) => {
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

const buildSeries = (measurementX, measurementY) => {
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
					"details[data-measurement-dropdown][name='measurementX2'] input[type=radio]:checked",
				)?.value ?? "stature"),
		);

	const canvas = document.getElementById("histogram-plot");
	resizeCanvasToContainer(canvas);

	const series = buildHistogramSeries(measurementX);
	const plot = new HistogramPlot(
		series.series,
		series.seriesColors,
		series.seriesLabels,
		3,
		{
			x: document.querySelector("input[name='measurementValueX2']").value
				? parseFloat(
						document.querySelector(
							"input[name='measurementValueX2']",
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

const refreshScatterPlot = () => {
	const measurementX = dataset.value
		.measurements()
		.find(
			(m) =>
				m.id ===
				(document.querySelector(
					"details[data-measurement-dropdown][name='measurementX'] input[type=radio]:checked",
				)?.value ?? "stature"),
		);
	const measurementY = dataset.value
		.measurements()
		.find(
			(m) =>
				m.id ===
				(document.querySelector(
					"details[data-measurement-dropdown][name='measurementY'] input[type=radio]:checked",
				)?.value ?? "weightkg"),
		);

	const canvas = document.getElementById("scatter-plot");
	resizeCanvasToContainer(canvas);

	const series = buildSeries(measurementX, measurementY);
	const plot = new ScatterPlot(
		series.series,
		series.seriesColors,
		series.seriesLabels,
		3,
		{
			x: document.querySelector("input[name='measurementValueX']").value
				? parseFloat(
						document.querySelector(
							"input[name='measurementValueX']",
						).value,
					)
				: undefined,
			y: document.querySelector("input[name='measurementValueY']").value
				? parseFloat(
						document.querySelector(
							"input[name='measurementValueY']",
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

const refreshResults = () => {
	refreshHistogramPlot();
	refreshScatterPlot();
};

const preferences = {
	value: getPreferences(),
};

const dataset = {
	value: null,
};

window.addEventListener("DOMContentLoaded", initialize);
window.addEventListener("resize", () => {
	refreshResults();
});
window.addEventListener("themechange", () => {
	refreshResults();
});
