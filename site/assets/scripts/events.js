/**
 * Constants for event names used in the application.
 */
export class EventName {
	/** Event fired when the active dataset changes. */
	static DATASET_CHANGED = "dataset-changed";
	/** Event fired when the active gender selection changes. */
	static GENDER_CHANGED = "gender-changed";
	/** Event fired when the unit system (metric/imperial) changes. */
	static UNIT_SYSTEM_CHANGED = "unit-system-changed";
	/** Event fired when the UI theme changes. */
	static THEME_CHANGED = "theme-changed";
}

/**
 * Data payload for the 'theme-changed' event.
 */
export class ThemeChangedEventData {
	/**
	 * @param {string} theme - The new theme ('light', 'dark', or 'system').
	 */
	constructor(theme) {
		this.theme = theme;
	}
}

/**
 * Data payload for the 'dataset-changed' event.
 */
export class DatasetChangedEventData {
	/**
	 * @param {import("./dataset.js").Dataset} dataset - The new active dataset.
	 * @param {string} unitSystem - The current unit system.
	 */
	constructor(dataset, unitSystem) {
		this.dataset = dataset;
		this.unitSystem = unitSystem;
	}
}

/**
 * Data payload for the 'gender-changed' event.
 */
export class GenderChangedEventData {
	/**
	 * @param {{male: boolean, female: boolean}} genders - The new gender selection state.
	 */
	constructor(genders) {
		this.genders = genders;
	}
}

/**
 * Data payload for the 'unit-system-changed' event.
 */
export class UnitSystemChangedEventData {
	/**
	 * @param {string} unitSystem - The new unit system code.
	 * @param {string} oldUnitSystem - The previous unit system code.
	 */
	constructor(unitSystem, oldUnitSystem) {
		this.unitSystem = unitSystem;
		this.oldUnitSystem = oldUnitSystem;
	}
}
