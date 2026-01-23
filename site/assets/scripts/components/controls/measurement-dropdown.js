import { Component } from "../component.js";

/**
 * Component for a dropdown list of measurements, including search functionality.
 * Controls the visibility of measurement options based on user input and handles selection events.
 * @extends Component
 */
class MeasurementDropdownComponent extends Component {
	/**
	 * Creates a new MeasurementDropdownComponent.
	 * @param {HTMLElement} element - The root element of the dropdown.
	 */
	constructor(element) {
		super(element);
		this.list = this.element.querySelector("ul");
		this.summary = this.element.querySelector("summary");
		this.searchInput = this.element.querySelector("input[type='search']");
		this.name = this.element.getAttribute("name");
		this.defaultValue = this.element.getAttribute(
			"data-measurement-dropdown-default",
		);

		// Attach search event listener if the input exists
		if (this.searchInput) {
			this.searchInput.addEventListener(
				"input",
				this.onSearch.bind(this),
			);
		}

		// Listen for changes on the radio buttons within the dropdown
		this.element.addEventListener("change", this.onChange.bind(this));
	}

	/**
	 * Handles input events on the search field.
	 * Filters the measurement options based on the search text.
	 * @param {Event} event - The input event.
	 */
	onSearch(event) {
		const inputText = event.target.value;
		const optionLabelElements = this.element.querySelectorAll("label");

		optionLabelElements.forEach((element) => {
			// Case-insensitive inclusion search
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

	/**
	 * Handles change events on the measurement radio buttons.
	 * Updates the summary text and dispatches a 'measurement-change' event.
	 * @param {Event} event - The change event.
	 */
	onChange(event) {
		// Only interested in radio button changes
		if (!event.target.matches("input[type=radio]")) {
			return;
		}

		const measurementId = event.target.value;
		const measurementLabel = event.target.parentElement.textContent.trim();

		this.updateSummary(measurementLabel);

		// Notify parent components about the selection change
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

	/**
	 * Updates the dropdown summary text (the visible button label).
	 * @param {string} label - The new label text.
	 */
	updateSummary(label) {
		if (this.summary) {
			this.summary.textContent = label;
		}
	}

	/**
	 * Updates the dropdown with a new set of measurements from a dataset.
	 * Preserves the current selection if it exists in the new dataset.
	 * @param {import("../../dataset.js").Dataset} dataset - The new dataset.
	 */
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

		// Clear existing measurement options (but keep search input structure)
		this.list.innerHTML = "";
		if (this.searchInput) {
			const li = document.createElement("li");
			li.appendChild(this.searchInput);
			this.list.appendChild(li);
			this.searchInput.value = ""; // Clear search
		}

		let selectedValue = null;
		// Check if the previously selected value exists in the new measurement list
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
