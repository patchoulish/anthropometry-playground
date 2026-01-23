export class EventName {
	static DATASET_CHANGED = "dataset-changed";
	static GENDER_CHANGED = "gender-changed";
	static UNIT_SYSTEM_CHANGED = "unit-system-changed";
	static THEME_CHANGED = "theme-changed";
}

export class ThemeChangedEventData {
	constructor(theme) {
		this.theme = theme;
	}
}

export class DatasetChangedEventData {
	constructor(dataset, unitSystem) {
		this.dataset = dataset;
		this.unitSystem = unitSystem;
	}
}

export class GenderChangedEventData {
	constructor(genders) {
		this.genders = genders;
	}
}

export class UnitSystemChangedEventData {
	constructor(unitSystem, oldUnitSystem) {
		this.unitSystem = unitSystem;
		this.oldUnitSystem = oldUnitSystem;
	}
}
