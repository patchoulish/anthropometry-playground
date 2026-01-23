/**
 * Manages user preferences for the application, persisting them to localStorage.
 */
export class Preferences {
	/**
	 * The key used to store preferences in localStorage.
	 * @type {string}
	 */
	static #STORAGE_KEY = "preferences";

	/**
	 * Creates a new Preferences instance and loads data.
	 */
	constructor() {
		this._data = this.#load();
	}

	/**
	 * Loads preferences from localStorage, applying defaults where necessary.
	 * @returns {Object} The preference data.
	 */
	#load() {
		const stored = localStorage.getItem(Preferences.#STORAGE_KEY);
		let data;

		if (stored) {
			try {
				data = JSON.parse(stored);
			} catch (e) {
				console.error("Failed to parse preferences", e);
			}
		}

		if (!data) {
			data = {
				dataset: "ansur2",
				genders: {
					male: true,
					female: true,
				},
				unit: "metric",
			};
		}

		// Ensure defaults for missing properties (migration support)
		if (!data.dataset) data.dataset = "ansur2";
		if (!data.genders) data.genders = { male: true, female: true };
		if (!data.unit) data.unit = "metric";

		return data;
	}

	/**
	 * Saves the current preferences to localStorage.
	 */
	save() {
		localStorage.setItem(
			Preferences.#STORAGE_KEY,
			JSON.stringify(this._data),
		);
	}

	/**
	 * Gets the ID of the selected dataset.
	 * @returns {string} The dataset ID.
	 */
	get dataset() {
		return this._data.dataset;
	}

	/**
	 * Sets the ID of the selected dataset and saves.
	 * @param {string} value The new dataset ID.
	 */
	set dataset(value) {
		this._data.dataset = value;
		this.save();
	}

	/**
	 * Gets the ID of the selected unit system.
	 * @returns {string} The unit system ID.
	 */
	get unit() {
		return this._data.unit;
	}

	/**
	 * Sets the ID of the selected unit system and saves.
	 * @param {string} value The new unit system ID.
	 */
	set unit(value) {
		this._data.unit = value;
		this.save();
	}

	/**
	 * Gets the gender selection state.
	 * @returns {{male: boolean, female: boolean}} The gender selection state.
	 */
	get genders() {
		return this._data.genders;
	}

	/**
	 * Sets the gender preference.
	 * @param {'male'|'female'} gender
	 * @param {boolean} value
	 */
	setGender(gender, value) {
		this._data.genders[gender] = value;
		this.save();
	}
}
