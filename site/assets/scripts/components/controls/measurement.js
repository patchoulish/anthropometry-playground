import { Component } from "../component.js";
import { MeasurementDropdownComponent } from "./measurement-dropdown.js";

class MeasurementComponent extends Component {
	constructor(element) {
		super(element);

		const dropdownElement = this.element.querySelector(
			"[data-measurement-dropdown]",
		);
		this.dropdown = new MeasurementDropdownComponent(dropdownElement);

		this.input = this.element.querySelector(
			"input[data-measurement-value]",
		);
		this.unitButton = this.element.querySelector("button[data-unit-for]");

		this.element.addEventListener(
			"measurement-change",
			this.onMeasurementChange.bind(this),
		);
	}

	onMeasurementChange(event) {
		const { datasetChanged } = event.detail;

		if (datasetChanged && this.input) {
			this.input.value = "";
		}
	}

	update(dataset) {
		this.dropdown.update(dataset);
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
