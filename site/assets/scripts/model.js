/**
 * Represents a gender.
 */
class Gender {
	/**
	 * The male gender.
	 * @type {Gender}
	 */
	static MALE = new Gender("male", "Male");

	/**
	 * The female gender.
	 * @type {Gender}
	 */
	static FEMALE = new Gender("female", "Female");

	/**
	 * Returns an array of all genders.
	 * @returns {Gender[]} An array of all genders.
	 */
	static all() {
		return [this.MALE, this.FEMALE];
	}

	/**
	 *
	 * @param {string} id The id for the gender.
	 * @param {string} name The name for the gender.
	 */
	constructor(id, name) {
		this.id = id;
		this.name = name;
	}
}

/**
 * Represents a system of units.
 */
class UnitSystem {
	/**
	 * The metric unit system.
	 * @type {UnitSystem}
	 */
	static METRIC = new UnitSystem("metric", "Metric");
	/**
	 * The imperial unit system.
	 * @type {UnitSystem}
	 */
	static IMPERIAL = new UnitSystem("imperial", "Imperial");

	/**
	 * Gets all defined unit systems.
	 * @returns {UnitSystem[]} An array of all defined unit systems.
	 */
	static all() {
		return [this.METRIC, this.IMPERIAL];
	}

	/**
	 * Creates a new instance.
	 * @param {string} id The id for the unit system.
	 * @param {string} name The name for the unit system.
	 */
	constructor(id, name) {
		this.id = id;
		this.name = name;
	}
}

/**
 * Represents a unit of measurement.
 */
class Unit {
	/**
	 * The unit for length measurements.
	 * @type {Unit}
	 */
	static LENGTH = new Unit("length", {
		metric: {
			abbreviation: "cm",
			conversionFactor: 100,
		},
		imperial: {
			abbreviation: "in",
			conversionFactor: 39.3701,
		},
	});
	/**
	 * The unit for mass measurements.
	 * @type {Unit}
	 */
	static MASS = new Unit("mass", {
		metric: {
			abbreviation: "kg",
			conversionFactor: 1,
		},
		imperial: {
			abbreviation: "lbs",
			conversionFactor: 2.20462,
		},
	});
	/**
	 * The unit for time measurements.
	 * @type {Unit}
	 */
	static TIME = new Unit("time", {
		metric: {
			abbreviation: "yrs",
			conversionFactor: 0.0000316887,
		},
		imperial: {
			abbreviation: "yrs",
			conversionFactor: 0.0000316887,
		},
	});
	/**
	 * Gets all defined units.
	 * @returns {Unit[]} An array of all defined units.
	 */
	static all() {
		return [this.LENGTH, this.MASS, this.TIME];
	}

	/**
	 * Creates a new instance.
	 * @param {string} id The id for the unit.
	 * @param {{metric: {abbreviation: string, conversionFactor: number}, imperial: {abbreviation: string, conversionFactor: number}}} forSystem The unit definitions for each unit system.
	 */
	constructor(
		id,
		forSystem = {
			metric: {
				abbreviation: undefined,
				conversionFactor: 1,
			},
			imperial: {
				abbreviation: undefined,
				conversionFactor: 1,
			},
		},
	) {
		this.id = id;
		this.forSystem = forSystem;
	}

	/**
	 * Converts the specified value to the specified unit system.
	 * @param {number} value The value to convert.
	 * @param {UnitSystem} system The target unit system.
	 * @returns {number} The converted value.
	 */
	convertTo(value, system) {
		return value * this.forSystem[system.id].conversionFactor;
	}
}

/**
 * Represents a measurement.
 */
class Measurement {
	/**
	 * Creates a new instance.
	 * @param {string} id The id for the measurement.
	 * @param {string} name The name for the measurement.
	 * @param {Unit} unit The unit for the measurement.
	 * @param {{male: Array<number>, female: Array<number>}} forGender The raw measurement values for each gender.
	 * @param {number} conversionFactor The conversion factor to apply to raw measurement values.
	 */
	constructor(
		id,
		name,
		unit,
		forGender = {
			male: null,
			female: null,
		},
		conversionFactor = 1,
	) {
		this.id = id;
		this.name = name;
		this.unit = unit;
		this.forGender = forGender;
		this.conversionFactor = conversionFactor;
	}

	/**
	 * Gets the measurement values for the specified gender.
	 * @param {Genders} gender The specified gender.
	 * @returns {Array<number>} An array of measurement values for the specified gender.
	 */
	valuesFor(gender) {
		// Apply conversion factor to raw values and return.
		return this.forGender[gender.id].map((v) => v / this.conversionFactor);
	}
}

export { Gender, UnitSystem, Unit, Measurement };
