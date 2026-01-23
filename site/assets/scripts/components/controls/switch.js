import { Component } from "../component.js";

/**
 * A wrapper for a checkbox styled as a switch.
 * Provides easy access to the checked state.
 * @extends Component
 */
class SwitchComponent extends Component {
	/**
	 * Creates a new SwitchComponent.
	 * @param {HTMLElement} element - The root element container.
	 */
	constructor(element) {
		super(element);
		this.input = this.element.querySelector(
			"input[type=checkbox][role=switch]",
		);
	}

	/**
	 * Gets the current checked state of the switch.
	 * @returns {boolean} True if checked, false otherwise.
	 */
	get checked() {
		return this.input?.checked ?? false;
	}

	/**
	 * Sets the checked state of the switch.
	 * @param {boolean} value - The new checked state.
	 */
	set checked(value) {
		if (this.input) {
			this.input.checked = value;
		}
	}

	/**
	 * Gets the name attribute of the underlying input.
	 * @returns {string|undefined} The name of the input.
	 */
	get name() {
		return this.input?.name;
	}
}

export { SwitchComponent };
