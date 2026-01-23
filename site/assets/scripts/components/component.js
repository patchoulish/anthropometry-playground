/**
 * Base class for all interactive UI components.
 * Provides a standard way to attach behavior to DOM elements.
 */
class Component {
	/**
	 * Creates a new Component instance.
	 * @param {HTMLElement} element - The root DOM element for this component.
	 */
	constructor(element) {
		/** @type {HTMLElement} The root DOM element. */
		this.element = element;
	}
}

export { Component };
