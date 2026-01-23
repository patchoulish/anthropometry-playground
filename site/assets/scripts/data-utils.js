import { Series } from "./math.js";
import { Gender } from "./model.js";

/**
 * Converts measurement values to the display unit based on preferences.
 * @param {number[]} values - The values to convert.
 * @param {string} measurementId - The ID of the measurement.
 * @param {import("./dataset.js").Dataset} dataset - The dataset.
 * @param {import("./preferences.js").Preferences} preferences - user preferences.
 * @returns {number[]} The converted values.
 */
export const convertValuesForDisplay = (
	values,
	measurementId,
	dataset,
	preferences,
) => {
	const measurement = dataset
		.measurements()
		.find((m) => m.id === measurementId);

	return values.map((v) =>
		measurement.unit.convertTo(v, { id: preferences.unit }),
	);
};

/**
 * Builds data series for single-variable plots.
 * @param {Object} measurementX - The measurement object.
 * @param {import("./dataset.js").Dataset} dataset - The dataset.
 * @param {import("./preferences.js").Preferences} preferences - user preferences.
 * @returns {{series: Series[], seriesLabels: string[], seriesColors: string[]}}
 */
export const buildSeries = (measurementX, dataset, preferences) => {
	const series = [];
	const seriesLabels = [];
	const seriesColors = [];

	if (preferences.genders.male) {
		series.push(
			new Series({
				x: convertValuesForDisplay(
					measurementX.valuesFor(Gender.MALE),
					measurementX.id,
					dataset,
					preferences,
				),
			}),
		);
		seriesLabels.push("Male");
		seriesColors.push("#2563eb");
	}

	if (preferences.genders.female) {
		series.push(
			new Series({
				x: convertValuesForDisplay(
					measurementX.valuesFor(Gender.FEMALE),
					measurementX.id,
					dataset,
					preferences,
				),
			}),
		);
		seriesLabels.push("Female");
		seriesColors.push("#db2777");
	}

	return {
		series: series,
		seriesLabels: seriesLabels,
		seriesColors: seriesColors,
	};
};

/**
 * Builds data series for two-variable plots.
 * @param {Object} measurementX - The X measurement.
 * @param {Object} measurementY - The Y measurement.
 * @param {import("./dataset.js").Dataset} dataset - The dataset.
 * @param {import("./preferences.js").Preferences} preferences - user preferences.
 * @returns {{series: Series[], seriesLabels: string[], seriesColors: string[]}}
 */
export const buildJointSeries = (
	measurementX,
	measurementY,
	dataset,
	preferences,
) => {
	const series = [];
	const seriesLabels = [];
	const seriesColors = [];

	if (preferences.genders.male) {
		series.push(
			new Series({
				x: convertValuesForDisplay(
					measurementX.valuesFor(Gender.MALE),
					measurementX.id,
					dataset,
					preferences,
				),
				y:
					measurementY === null
						? []
						: convertValuesForDisplay(
								measurementY.valuesFor(Gender.MALE),
								measurementY.id,
								dataset,
								preferences,
							),
			}),
		);
		seriesLabels.push("Male");
		seriesColors.push("#2563eb");
	}

	if (preferences.genders.female) {
		series.push(
			new Series({
				x: convertValuesForDisplay(
					measurementX.valuesFor(Gender.FEMALE),
					measurementX.id,
					dataset,
					preferences,
				),
				y:
					measurementY === null
						? []
						: convertValuesForDisplay(
								measurementY.valuesFor(Gender.FEMALE),
								measurementY.id,
								dataset,
								preferences,
							),
			}),
		);
		seriesLabels.push("Female");
		seriesColors.push("#db2777");
	}

	return {
		series: series,
		seriesLabels: seriesLabels,
		seriesColors: seriesColors,
	};
};

/**
 * Gets the abbreviation for a measurement's unit.
 * @param {string} measurementId - The measurement ID.
 * @param {import("./dataset.js").Dataset} dataset - The dataset.
 * @param {import("./preferences.js").Preferences} preferences - The preferences.
 * @returns {string} The unit abbreviation.
 */
export const getUnitAbbreviationForMeasurement = (
	measurementId,
	dataset,
	preferences,
) => {
	const measurement = dataset
		.measurements()
		.find((m) => m.id === measurementId);
	if (!measurement) {
		return "";
	}
	return measurement.unit.forSystem[preferences.unit].abbreviation;
};
