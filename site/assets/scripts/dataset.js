import { Measurement, Unit } from "./model.js";

/**
 * Represents a dataset of measurements.
 */
class Dataset {
	static ANSUR1 = new Dataset("ansur1", "ANSUR I");
	static ANSUR2 = new Dataset("ansur2", "ANSUR II");

	/**
	 * Returns an array of all datasets.
	 * @returns {Dataset[]} An array of all datasets.
	 */
	static all() {
		return [this.ANSUR1, this.ANSUR2];
	}

	/**
	 * Creates a new instance.
	 * @param {string} id The id for the instance.
	 * @param {string} name The name for the instance.
	 */
	constructor(id, name) {
		this.id = id;
		this.name = name;

		this._measurements = null;
	}

	/**
	 * Returns whether the measurements for the dataset have been fetched.
	 * @returns {boolean} Whether the measurements have been fetched.
	 */
	fetched() {
		return this._measurements !== null;
	}

	/**
	 * Returns the measurements for the dataset.
	 * @returns {Measurement[]} The measurements for the dataset.
	 */
	measurements() {
		if (!this.fetched()) {
			throw new Error(`Dataset "${this.id}" has not been fetched yet.`);
		}

		return this._measurements;
	}

	/**
	 * Fetches the measurements for the dataset.
	 * @returns {Promise<void>} A promise that resolves when the measurements have been fetched.
	 */
	async fetch() {
		if (this.fetched()) {
			return;
		}

		const [measurements, male, female] = await Promise.all([
			fetch(`assets/data/${this.id}/measurements.json`).then((res) =>
				res.json(),
			),
			fetch(`assets/data/${this.id}/by-gender/male.json`).then((res) =>
				res.json(),
			),
			fetch(`assets/data/${this.id}/by-gender/female.json`).then((res) =>
				res.json(),
			),
		]);

		this._measurements = Object.entries(measurements).map(
			([id, measurement]) =>
				new Measurement(
					id,
					measurement.name,
					Unit.all().find((unit) => unit.id === measurement.unit),
					{
						male: male[id],
						female: female[id],
					},
					measurement.conversionFactor,
				),
		);

		return;
	}
}

export { Dataset };
