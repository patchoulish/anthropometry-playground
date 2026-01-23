import { Component } from "../component.js";
import { MeasurementDropdownComponent } from "./measurement-dropdown.js";
import { EventName } from "../../events.js";

/**
 * Composite component handling a measurement selection.
 * Includes a dropdown for selecting the measurement type and an input for value.
 * Handles unit conversions and updates based on global dataset or unit system changes.
 * @extends Component
 */
class MeasurementComponent extends Component {
	/**
	 * Creates a new MeasurementComponent.
	 * @param {HTMLElement} element - The root element.
	 */
	constructor(element) {
		super(element);

		// Initialize the dropdown sub-component
		const dropdownElement = this.element.querySelector(
			"[data-measurement-dropdown]",
		);
		this.dropdown = new MeasurementDropdownComponent(dropdownElement);

		this.input = this.element.querySelector(
			"input[data-measurement-value]",
		);
		this.unitButton = this.element.querySelector("button[data-unit-for]");

		// Listen for measurement changes from the dropdown
		this.element.addEventListener(
			"measurement-change",
			this.onMeasurementChange.bind(this),
		);

		// Subscribe to global events for dataset and unit system changes
		window.addEventListener(
			EventName.DATASET_CHANGED,
			this.onDatasetChanged.bind(this),
		);
		window.addEventListener(
			EventName.UNIT_SYSTEM_CHANGED,
			this.onUnitSystemChanged.bind(this),
		);

		this.dataset = null;
		this.currentUnitSystem = "metric";
	}

	/**
	 * Handles a change in the selected measurement type.
	 * Updates the unit label to match the new measurement's units in the current system.
	 * Clears the input value.
	 * @param {CustomEvent} event - The measurement change event.
	 */
	onMeasurementChange(event) {
		const { measurementId } = event.detail;

		if (this.dataset && this.currentUnitSystem) {
			const measurement = this.dataset
				.measurements()
				.find((m) => m.id === measurementId);

			if (measurement) {
				const abbrev =
					measurement.unit.forSystem[this.currentUnitSystem]
						.abbreviation;
				this.updateUnitLabel(abbrev);
			}
		}

		if (this.input) {
			this.input.value = "";
		}
	}

	/**
	 * Handles the global dataset changed event.
	 * Propagates the update to the dropdown component.
	 * @param {CustomEvent} event - The dataset change event.
	 */
	onDatasetChanged(event) {
		const { dataset, unitSystem } = event.detail;
		this.update(dataset, unitSystem);
	}

	/**
	 * Handles changes to the global unit system (e.g., Metric vs Imperial).
	 * Updates the unit label and converts the current input value if valid.
	 * @param {CustomEvent} event - The unit system change event.
	 */
	onUnitSystemChanged(event) {
		const { unitSystem, oldUnitSystem } = event.detail;
		this.currentUnitSystem = unitSystem;

		if (!this.dataset || !this.measurementId) {
			return;
		}

		const measurement = this.dataset
			.measurements()
			.find((m) => m.id === this.measurementId);

		if (!measurement) {
			return;
		}

		// Update label to the new unit abbreviation
		const unitAbbreviation =
			measurement.unit.forSystem[unitSystem].abbreviation;
		this.updateUnitLabel(unitAbbreviation);

		// Update value if needed (convert existing value)
		if (this.inputValue && !isNaN(this.inputValue) && oldUnitSystem) {
			const oldUnitSystemData = measurement.unit.forSystem[oldUnitSystem];
			const newUnitSystemData = measurement.unit.forSystem[unitSystem];

			// Perform conversion if both unit systems define a conversion factor
			if (oldUnitSystemData && newUnitSystemData) {
				const oldConversionFactor = oldUnitSystemData.conversionFactor;
				const newConversionFactor = newUnitSystemData.conversionFactor;

				if (
					oldConversionFactor &&
					oldConversionFactor !== 0 &&
					newConversionFactor &&
					newConversionFactor !== 0
				) {
					const newValue =
						this.inputValue *
						(newConversionFactor / oldConversionFactor);
					this.inputValue = newValue.toFixed(2);
				}
			}
		}
	}

	update(dataset, unitSystem) {
		this.dataset = dataset;
		if (unitSystem) {
			this.currentUnitSystem = unitSystem;
		}

		this.dropdown.update(dataset);

		if (this.measurementId && this.currentUnitSystem) {
			const measurement = this.dataset
				.measurements()
				.find((m) => m.id === this.measurementId);

			if (measurement) {
				const abbrev =
					measurement.unit.forSystem[this.currentUnitSystem]
						.abbreviation;
				this.updateUnitLabel(abbrev);
			}
		}
	}

	updateUnitLabel(abbreviation) {
		if (this.unitButton) {
			this.unitButton.textContent = abbreviation;
		}
	}

	get measurementId() {
		return this.dropdown.element.querySelector("input[type=radio]:checked")
			?.value;
	}

	get inputValue() {
		return this.input ? parseFloat(this.input.value) : NaN;
	}

	set inputValue(val) {
		if (this.input) this.input.value = val;
	}

	get name() {
		return this.element.getAttribute("name");
	}
}

export { MeasurementComponent };
