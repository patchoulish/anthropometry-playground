import { Component } from "../component.js";

class MeasurementDropdownComponent extends Component {
	constructor(element) {
		super(element);
		this.list = this.element.querySelector("ul");
		this.summary = this.element.querySelector("summary");
		this.searchInput = this.element.querySelector("input[type='search']");
		this.name = this.element.getAttribute("name");
		this.defaultValue = this.element.getAttribute(
			"data-measurement-dropdown-default",
		);

		if (this.searchInput) {
			this.searchInput.addEventListener(
				"input",
				this.onSearch.bind(this),
			);
		}

		this.element.addEventListener("change", this.onChange.bind(this));
	}

	onSearch(event) {
		const inputText = event.target.value;
		const optionLabelElements = this.element.querySelectorAll("label");

		optionLabelElements.forEach((element) => {
			if (
				!element.innerText
					.toLowerCase()
					.includes(inputText.toLowerCase())
			) {
				element.parentElement.setAttribute("hidden", "true");
			} else {
				element.parentElement.removeAttribute("hidden");
			}
		});
	}

	onChange(event) {
		if (!event.target.matches("input[type=radio]")) {
			return;
		}

		const measurementId = event.target.value;
		const measurementLabel = event.target.parentElement.textContent.trim();

		this.updateSummary(measurementLabel);

		this.element.dispatchEvent(
			new CustomEvent("measurement-change", {
				bubbles: true,
				detail: {
					measurementId,
					name: this.name,
				},
			}),
		);
	}

	updateSummary(label) {
		if (this.summary) {
			this.summary.textContent = label;
		}
	}

	update(dataset) {
		const formattedMeasurements = dataset
			.measurements()
			.map((measurement) => {
				return {
					label: measurement.name,
					value: measurement.id,
				};
			});

		// Get currently selected measurement before clearing
		const currentlySelectedElement = this.element.querySelector(
			"input[type=radio]:checked",
		);
		const currentlySelectedValue = currentlySelectedElement?.value;

		// Clear existing measurement options (keep search input)
		this.list.innerHTML = "";
		if (this.searchInput) {
			const li = document.createElement("li");
			li.appendChild(this.searchInput);
			this.list.appendChild(li);
			this.searchInput.value = ""; // Clear search
		}

		let selectedValue = null;
		const currentExistsInNew =
			currentlySelectedValue &&
			formattedMeasurements.some(
				(m) => m.value === currentlySelectedValue,
			);

		if (currentExistsInNew) {
			selectedValue = currentlySelectedValue;
		} else if (
			formattedMeasurements.some((m) => m.value === this.defaultValue)
		) {
			selectedValue = this.defaultValue;
		} else if (formattedMeasurements.length > 0) {
			selectedValue = formattedMeasurements[0].value;
		}

		formattedMeasurements.forEach((measurement) => {
			const li = document.createElement("li");
			const label = document.createElement("label");
			const input = document.createElement("input");

			input.type = "radio";
			input.name = this.name;
			input.value = measurement.value;

			if (measurement.value === selectedValue) {
				input.checked = true;
			}

			label.append(
				input,
				document.createTextNode(`${measurement.label}`),
			);
			li.appendChild(label);
			this.list.appendChild(li);
		});

		// Trigger update of summary and notify parent
		const selectedOption = this.element.querySelector(
			"input[type=radio]:checked",
		);
		if (selectedOption) {
			const label = selectedOption.parentElement.textContent.trim();
			this.updateSummary(label);

			this.element.dispatchEvent(
				new CustomEvent("measurement-change", {
					bubbles: true,
					detail: {
						measurementId: selectedOption.value,
						name: this.name,
						datasetChanged: true,
					},
				}),
			);
		} else {
			this.updateSummary("Measurement");
		}

		return !currentExistsInNew;
	}
}

export { MeasurementDropdownComponent };
