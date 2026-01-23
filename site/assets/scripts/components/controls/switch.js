import { Component } from "../component.js";

class SwitchComponent extends Component {
	constructor(element) {
		super(element);
		this.input = this.element.querySelector(
			"input[type=checkbox][role=switch]",
		);
	}

	get checked() {
		return this.input?.checked ?? false;
	}

	set checked(value) {
		if (this.input) {
			this.input.checked = value;
		}
	}

	get name() {
		return this.input?.name;
	}
}

export { SwitchComponent };
