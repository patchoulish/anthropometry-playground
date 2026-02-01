import { Component } from "../component.js";
import { MeasurementDropdownComponent } from "../controls/measurement-dropdown.js";
import { Series, LDAClassifier, BayesianClassifier } from "../../math.js";
import { Gender } from "../../model.js";
import { convertValuesForDisplay } from "../../data-utils.js";
import { EventName } from "../../events.js";

/**
 * Color constants for gender display.
 */
const COLORS = {
	male: "#2563eb",
	female: "#db2777",
	neutral: "#6b7280",
};

/**
 * Component for the Bayesian gender classification experiment.
 * Allows users to enter multiple measurements and classifies them based on the ANSUR dataset.
 * @extends Component
 */
class ClassificationComponent extends Component {
	/**
	 * Creates a new ClassificationComponent.
	 * @param {HTMLElement} element - The root element.
	 */
	constructor(element) {
		super(element);

		this.cardsContainer = this.element.querySelector(
			"[data-classification-rows]",
		);
		this.addButton = this.element.querySelector(
			"[data-add-measurement-row]",
		);
		this.resultText = this.element.querySelector("[data-result-text]");
		this.resultSummary = this.element.querySelector(
			"[data-result-summary]",
		);
		this.resultWinner = this.element.querySelector("[data-result-winner]");
		this.resultEvidence = this.element.querySelector(
			"[data-result-evidence]",
		);
		this.resultBayesFactor = this.element.querySelector(
			"[data-result-bayes-factor]",
		);
		this.resultBayesFactorNote = this.element.querySelector(
			"[data-result-bayes-factor-note]",
		);
		this.resultDetails = this.element.querySelector(
			"[data-result-details]",
		);
		this.resultProbabilities = this.element.querySelector(
			"[data-result-probabilities]",
		);
		this.resultWork = this.element.querySelector("[data-result-work]");
		this.resultWorkContent = this.element.querySelector(
			"[data-result-work-content]",
		);

		// Classifier dropdown elements
		this.classifierDropdown = this.element.querySelector(
			"[data-classifier-dropdown]",
		);
		this.classifierSummary = this.element.querySelector(
			"[data-classifier-summary]",
		);

		/** @type {{ dropdown: MeasurementDropdownComponent, input: HTMLInputElement, unitButton: HTMLButtonElement, card: HTMLDivElement, measurementId: string | null }[]} */
		this.measurementCards = [];

		this.dataset = null;
		this.currentUnitSystem = "metric";
		this.currentClassifier = "lda"; // Default classifier

		this.rowCounter = 0;

		// Bind event handlers
		this.addButton.addEventListener("click", () => this.addCard());

		// Handle classifier selection
		if (this.classifierDropdown) {
			const classifierInputs = this.classifierDropdown.querySelectorAll(
				'input[name="classifier"]',
			);
			classifierInputs.forEach((input) => {
				input.addEventListener("change", (e) => {
					this.currentClassifier = e.target.value;
					this.updateClassifierSummary();
					this.classify();
				});
			});
		}

		// Listen for dataset and unit changes
		window.addEventListener(
			EventName.DATASET_CHANGED,
			this.onDatasetChanged.bind(this),
		);
		window.addEventListener(
			EventName.UNIT_SYSTEM_CHANGED,
			this.onUnitSystemChanged.bind(this),
		);
	}

	/**
	 * Updates the component with a new dataset.
	 * @param {import("../../dataset.js").Dataset} dataset - The dataset.
	 * @param {string} unitSystem - The unit system.
	 */
	update(dataset, unitSystem) {
		this.dataset = dataset;
		this.currentUnitSystem = unitSystem || "metric";

		// Update all existing dropdowns
		this.measurementCards.forEach((cardData) => {
			cardData.dropdown.update(dataset);
			this.updateCardUnit(cardData);
		});

		// Sync dropdown disabled states
		this.syncDropdownDisabledStates();

		// Add initial card if none exist
		if (this.measurementCards.length === 0) {
			this.addCard("stature");
		}

		this.classify();
	}

	/**
	 * Handles dataset change events.
	 * @param {CustomEvent} event - The event.
	 */
	onDatasetChanged(event) {
		const { dataset, unitSystem } = event.detail;
		this.update(dataset, unitSystem);
	}

	/**
	 * Updates the classifier dropdown summary text.
	 */
	updateClassifierSummary() {
		if (!this.classifierSummary) return;

		const summaryText =
			this.currentClassifier === "lda"
				? "Linear Discriminant Analysis"
				: "Naive Bayes";
		this.classifierSummary.textContent = summaryText;
	}

	/**
	 * Handles unit system change events.
	 * @param {CustomEvent} event - The event.
	 */
	onUnitSystemChanged(event) {
		const { unitSystem, oldUnitSystem } = event.detail;
		this.currentUnitSystem = unitSystem;

		// Convert values and update unit labels
		this.measurementCards.forEach((cardData) => {
			const measurementId = cardData.dropdown.element.querySelector(
				"input[type=radio]:checked",
			)?.value;

			if (!measurementId || !this.dataset) return;

			const measurement = this.dataset
				.measurements()
				.find((m) => m.id === measurementId);
			if (!measurement) return;

			// Update unit label
			const abbrev = measurement.unit.forSystem[unitSystem].abbreviation;
			cardData.unitButton.textContent = abbrev;

			// Convert value
			const currentValue = parseFloat(cardData.input.value);
			if (!isNaN(currentValue) && oldUnitSystem) {
				const oldFactor =
					measurement.unit.forSystem[oldUnitSystem].conversionFactor;
				const newFactor =
					measurement.unit.forSystem[unitSystem].conversionFactor;
				if (oldFactor && newFactor) {
					cardData.input.value = (
						currentValue *
						(newFactor / oldFactor)
					).toFixed(2);
				}
			}
		});

		this.classify();
	}

	/**
	 * Gets the set of currently selected measurement IDs across all cards.
	 * @returns {Set<string>} Set of selected measurement IDs.
	 */
	getSelectedMeasurementIds() {
		const ids = new Set();
		for (const cardData of this.measurementCards) {
			if (cardData.measurementId) {
				ids.add(cardData.measurementId);
			}
		}
		return ids;
	}

	/**
	 * Finds the next available (unselected) measurement ID.
	 * @returns {string | null} The next available measurement ID, or null if all are selected.
	 */
	getNextAvailableMeasurementId() {
		if (!this.dataset) return null;

		const selectedIds = this.getSelectedMeasurementIds();
		const allMeasurements = this.dataset.measurements();

		for (const measurement of allMeasurements) {
			if (!selectedIds.has(measurement.id)) {
				return measurement.id;
			}
		}
		return null;
	}

	/**
	 * Syncs the disabled state of measurement options across all dropdowns.
	 * Disables options that are selected in other cards.
	 */
	syncDropdownDisabledStates() {
		const selectedIds = this.getSelectedMeasurementIds();

		for (const cardData of this.measurementCards) {
			const currentSelection = cardData.measurementId;
			const radioInputs =
				cardData.dropdown.element.querySelectorAll("input[type=radio]");

			radioInputs.forEach((radio) => {
				const li = radio.closest("li");
				// Disable if selected elsewhere (but not in this card)
				if (
					selectedIds.has(radio.value) &&
					radio.value !== currentSelection
				) {
					radio.disabled = true;
					if (li) li.style.opacity = "0.5";
				} else {
					radio.disabled = false;
					if (li) li.style.opacity = "";
				}
			});
		}

		// Disable add button if all measurements are used
		if (this.dataset) {
			const allMeasurements = this.dataset.measurements();
			this.addButton.disabled =
				selectedIds.size >= allMeasurements.length;
		}
	}

	/**
	 * Adds a new measurement card.
	 * @param {string} [defaultMeasurement] - The default measurement ID. If not provided, uses next available.
	 */
	addCard(defaultMeasurement) {
		// Determine which measurement to use
		let measurementToSelect = defaultMeasurement;
		if (!measurementToSelect) {
			measurementToSelect = this.getNextAvailableMeasurementId();
		}
		if (!measurementToSelect) {
			// All measurements are already selected
			return;
		}

		const cardId = this.rowCounter++;
		const cardName = `classificationMeasurement${cardId}`;

		const card = document.createElement("div");
		card.className = "classification-card";
		card.innerHTML = `
			<div class="classification-card-content">
				<details class="dropdown"
				         name="${cardName}"
				         data-measurement-dropdown
				         data-measurement-dropdown-default="${measurementToSelect}">
					<summary>Measurement</summary>
					<ul>
						<li>
							<input type="search" placeholder="Search" aria-label="Search" />
						</li>
					</ul>
				</details>
				<fieldset role="group">
					<input type="number" data-measurement-value />
					<button class="contrast" data-unit-button disabled></button>
				</fieldset>
			</div>
			<div class="classification-card-remove">
				<button class="outline contrast" data-remove-row title="Remove">&times;</button>
			</div>
		`;

		this.cardsContainer.appendChild(card);

		const dropdownElement = card.querySelector(
			"[data-measurement-dropdown]",
		);
		const dropdown = new MeasurementDropdownComponent(dropdownElement);
		const input = card.querySelector("input[data-measurement-value]");
		const unitButton = card.querySelector("[data-unit-button]");
		const removeButton = card.querySelector("[data-remove-row]");

		const cardData = {
			dropdown,
			input,
			unitButton,
			card,
			measurementId: null,
		};
		this.measurementCards.push(cardData);

		// Update dropdown with dataset
		if (this.dataset) {
			dropdown.update(this.dataset);
			this.updateCardUnit(cardData);
		}

		// Sync disabled states after adding
		this.syncDropdownDisabledStates();

		// Listen for measurement changes
		dropdownElement.addEventListener("measurement-change", () => {
			this.updateCardUnit(cardData);
			this.syncDropdownDisabledStates();
			input.value = "";
			this.classify();
		});

		// Listen for value changes
		input.addEventListener("input", () => {
			this.classify();
		});

		// Listen for remove
		removeButton.addEventListener("click", () => {
			this.removeCard(cardData);
		});
	}

	/**
	 * Updates the unit label for a card.
	 * @param {{ dropdown: MeasurementDropdownComponent, input: HTMLInputElement, unitButton: HTMLButtonElement, card: HTMLDivElement, measurementId: string | null }} cardData - The card data.
	 */
	updateCardUnit(cardData) {
		if (!this.dataset) return;

		const measurementId = cardData.dropdown.element.querySelector(
			"input[type=radio]:checked",
		)?.value;

		cardData.measurementId = measurementId || null;

		if (!measurementId) return;

		const measurement = this.dataset
			.measurements()
			.find((m) => m.id === measurementId);

		if (measurement) {
			const abbrev =
				measurement.unit.forSystem[this.currentUnitSystem].abbreviation;
			cardData.unitButton.textContent = abbrev;
		}
	}

	/**
	 * Renders the evidence breakdown (show your work) section for LDA.
	 * @param {{ winner: { series: Series, label: string }, results: { series: Series, label: string, score: number, posterior: number }[], bayesFactor: number, evidence: { category: string, label: string, favors: string }, perDimension: Object, mahalanobis: { label: string, distance: number }[] }} result - The LDA classification result.
	 * @param {Object.<string, { name: string, value: number, unit: string }>} measurementInfo - Info about each measurement.
	 */
	renderEvidenceBreakdown(result, measurementInfo) {
		this.resultWorkContent.innerHTML = "";

		const formatZ = (z) => (z >= 0 ? `+${z.toFixed(2)}` : z.toFixed(2));
		const formatBF = (bf) => {
			if (bf === Infinity) return "∞";
			if (bf === 0) return "0";
			if (bf >= 1) return bf.toFixed(2);
			return `1/${(1 / bf).toFixed(2)}`;
		};
		const formatPct = (p) => `${(p * 100).toFixed(1)}%`;

		const isLDA = this.currentClassifier === "lda";

		// Show Mahalanobis distances if available
		if (result.mahalanobis && result.mahalanobis.length === 2) {
			const mahalSection = document.createElement("div");
			mahalSection.className =
				"classification-work-item mahalanobis-section";

			const [d0, d1] = result.mahalanobis;
			const closerTo = d0.distance < d1.distance ? d0.label : d1.label;
			const closerColor =
				closerTo === "Male" ? COLORS.male : COLORS.female;

			mahalSection.innerHTML = `
				<div class="evidence-header">
					<span class="measurement-name">Mahalanobis Distance</span>
					<span class="evidence-label" style="color: ${closerColor}">Closer to ${closerTo}</span>
				</div>
				<div class="evidence-details">
					<div class="evidence-row">
						<span class="evidence-metric">Distance:</span>
						<span>
							<span style="color: ${COLORS.male}">Male</span>: ${d0.distance.toFixed(2)}${d0.distance < d1.distance ? " ✓" : ""}
						</span>
						<span class="evidence-separator">|</span>
						<span>
							<span style="color: ${COLORS.female}">Female</span>: ${d1.distance.toFixed(2)}${d1.distance < d0.distance ? " ✓" : ""}
						</span>
					</div>
				</div>
			`;
			this.resultWorkContent.appendChild(mahalSection);
		}

		// Show per-dimension breakdown with LDA weights
		const numDimensions = Object.keys(result.perDimension).length;
		const naiveBayesWeight = 1.0 / numDimensions;

		for (const [measurementId, evidence] of Object.entries(
			result.perDimension,
		)) {
			const info = measurementInfo[measurementId];
			if (!info) continue;

			const favorsLabel =
				evidence.evidence.favors === "first" ? "Male" : "Female";
			const color =
				evidence.evidence.favors === "first"
					? COLORS.male
					: COLORS.female;

			const zMale = evidence.zScores["Male"];
			const zFemale = evidence.zScores["Female"];

			// Determine which z-score is closer to 0 (more typical)
			const maleMoreTypical = Math.abs(zMale) < Math.abs(zFemale);

			// Weight (LDA weight or uniform for Naive Bayes)
			const weightPct =
				evidence.weight !== undefined
					? formatPct(evidence.weight)
					: formatPct(naiveBayesWeight);
			const weightLabel = "Weight";

			const item = document.createElement("div");
			item.className = "classification-work-item";
			item.innerHTML = `
				<div class="evidence-header">
					<span class="measurement-name">${info.name}</span>
					<span class="evidence-label" style="color: ${color}">${evidence.evidence.label} → ${favorsLabel}</span>
				</div>
				<div class="evidence-details">
					<div class="evidence-row">
						<span class="evidence-metric">${weightLabel}:</span>
						<span>${weightPct}</span>
					</div>
					<div class="evidence-row">
						<span class="evidence-metric">Z-scores:</span>
						<span>
							<span style="color: ${COLORS.male}">Male</span>: ${formatZ(zMale)}σ${maleMoreTypical ? " ✓" : ""}
						</span>
						<span class="evidence-separator">|</span>
						<span>
							<span style="color: ${COLORS.female}">Female</span>: ${formatZ(zFemale)}σ${!maleMoreTypical ? " ✓" : ""}
						</span>
					</div>
					<div class="evidence-row">
						<span class="evidence-metric">Likelihood ratio:</span>
						<span>${formatBF(evidence.bayesFactor)} (${evidence.bayesFactor >= 1 ? "favors Male" : "favors Female"})</span>
					</div>
				</div>
			`;
			this.resultWorkContent.appendChild(item);
		}
	}

	/**
	 * Clears the evidence breakdown section.
	 */
	clearEvidenceBreakdown() {
		this.resultWorkContent.innerHTML = "";
	}

	/**
	 * Removes a measurement card.
	 * @param {{ dropdown: MeasurementDropdownComponent, input: HTMLInputElement, unitButton: HTMLButtonElement, card: HTMLDivElement, measurementId: string | null }} cardData - The card data.
	 */
	removeCard(cardData) {
		const index = this.measurementCards.indexOf(cardData);
		if (index > -1) {
			this.measurementCards.splice(index, 1);
			cardData.card.remove();
			this.syncDropdownDisabledStates();
			this.classify();
		}
	}

	/**
	 * Performs the classification based on current measurements.
	 */
	classify() {
		if (!this.dataset) {
			this.showNoResult("Dataset not loaded.");
			return;
		}

		// Gather measurements with valid values
		const point = {};
		const measurementIds = [];

		for (const cardData of this.measurementCards) {
			const measurementId = cardData.dropdown.element.querySelector(
				"input[type=radio]:checked",
			)?.value;
			const value = parseFloat(cardData.input.value);

			if (measurementId && !isNaN(value)) {
				// Use measurementId as the dimension key
				point[measurementId] = value;
				measurementIds.push(measurementId);
			}
		}

		if (Object.keys(point).length === 0) {
			this.showNoResult(
				"Add at least one measurement with a value to see the classification result.",
			);
			return;
		}

		// Build series for male and female with the selected measurements
		const maleSeries = this.buildSeriesForGender(
			Gender.MALE,
			measurementIds,
		);
		const femaleSeries = this.buildSeriesForGender(
			Gender.FEMALE,
			measurementIds,
		);

		if (!maleSeries || !femaleSeries) {
			this.showNoResult("Unable to build series for classification.");
			return;
		}

		// Create classifier based on selection
		let classifier;
		if (this.currentClassifier === "naive-bayes") {
			classifier = new BayesianClassifier([maleSeries, femaleSeries]);
		} else {
			classifier = new LDAClassifier([maleSeries, femaleSeries]);
		}
		const result = classifier.classifyWithDetails(point);

		this.showResult(result);
	}

	/**
	 * Builds a Series for a specific gender using the selected measurements.
	 * @param {Gender} gender - The gender.
	 * @param {string[]} measurementIds - The measurement IDs to include.
	 * @returns {Series|null} The series, or null if failed.
	 */
	buildSeriesForGender(gender, measurementIds) {
		const values = {};

		for (const measurementId of measurementIds) {
			const measurement = this.dataset
				.measurements()
				.find((m) => m.id === measurementId);

			if (!measurement) return null;

			const rawValues = measurement.valuesFor(gender);
			const convertedValues = convertValuesForDisplay(
				rawValues,
				measurementId,
				this.dataset,
				{ unit: this.currentUnitSystem },
			);

			values[measurementId] = convertedValues;
		}

		return new Series(values);
	}

	/**
	 * Shows the classification result.
	 * @param {{ winner: { series: Series, label: string }, results: { series: Series, label: string, logPosterior: number, posterior: number }[], bayesFactor: number, evidence: { category: string, label: string, favors: string }, perDimension: Object }} result - The result.
	 */
	showResult(result) {
		const winnerLabel = result.winner.label;
		const winnerColor =
			winnerLabel === "Male" ? COLORS.male : COLORS.female;

		// Hide the placeholder text
		this.resultText.style.display = "none";

		// Show the summary section
		this.resultSummary.style.display = "block";
		this.resultWinner.textContent = winnerLabel;
		this.resultWinner.style.color = winnerColor;

		this.resultEvidence.textContent = `(${result.evidence.label})`;
		this.resultEvidence.style.color = winnerColor;

		// Format Bayes factor
		let bfDisplay;
		if (result.bayesFactor === Infinity) {
			bfDisplay = "∞";
		} else if (result.bayesFactor === 0) {
			bfDisplay = "0";
		} else if (result.bayesFactor >= 1) {
			bfDisplay = result.bayesFactor.toFixed(2);
		} else {
			bfDisplay = `1/${(1 / result.bayesFactor).toFixed(2)}`;
		}
		this.resultBayesFactor.textContent = bfDisplay;

		// Add note about direction
		const bfNote =
			result.bayesFactor >= 1 ? " (favors Male)" : " (favors Female)";
		this.resultBayesFactorNote.textContent = bfNote;
		this.resultBayesFactorNote.style.color =
			result.bayesFactor >= 1 ? COLORS.male : COLORS.female;

		// Show posterior probabilities
		this.resultDetails.style.display = "block";
		this.resultProbabilities.innerHTML = "";

		for (const r of result.results) {
			const row = document.createElement("tr");
			const color = r.label === "Male" ? COLORS.male : COLORS.female;
			row.innerHTML = `
				<td style="color: ${color}">${r.label}</td>
				<td>${(r.posterior * 100).toFixed(2)}%</td>
			`;
			this.resultProbabilities.appendChild(row);
		}

		// Build measurement info for evidence breakdown
		const measurementInfo = {};
		for (const cardData of this.measurementCards) {
			const measurementId = cardData.measurementId;
			const value = parseFloat(cardData.input.value);
			if (measurementId && !isNaN(value) && this.dataset) {
				const measurement = this.dataset
					.measurements()
					.find((m) => m.id === measurementId);
				if (measurement) {
					measurementInfo[measurementId] = {
						name: measurement.name,
						value: value,
						unit: measurement.unit.forSystem[this.currentUnitSystem]
							.abbreviation,
					};
				}
			}
		}

		// Show evidence breakdown
		this.resultWork.style.display = "block";
		this.renderEvidenceBreakdown(result, measurementInfo);
	}

	/**
	 * Shows a message when no result can be computed.
	 * @param {string} message - The message.
	 */
	showNoResult(message) {
		this.resultText.textContent = message;
		this.resultText.style.display = "block";
		this.resultSummary.style.display = "none";
		this.resultDetails.style.display = "none";
		this.resultWork.style.display = "none";
		this.resultProbabilities.innerHTML = "";
		this.clearEvidenceBreakdown();
	}
}

export { ClassificationComponent };
