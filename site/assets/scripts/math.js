/**
 * Calculates the arithmetic mean of an array of numbers.
 * @param {number[]} x - The input array.
 * @returns {number} The mean value, or 0 if empty.
 */
function mean(x) {
	if (x.length === 0) return 0;
	return x.reduce((a, b) => a + b, 0) / x.length;
}

/**
 * Calculates the standard deviation of an array of numbers.
 * @param {number[]} x - The input array.
 * @param {number} mx - The pre-calculated mean of the array.
 * @returns {number} The standard deviation, or 0 if empty.
 */
function stddev(x, mx) {
	if (x.length === 0) return 0;
	return Math.sqrt(x.reduce((s, v) => s + (v - mx) ** 2, 0) / x.length);
}

/**
 * Calculates the covariance between two arrays of numbers.
 * @param {number[]} x - The first array.
 * @param {number} mx - The mean of the first array.
 * @param {number[]} y - The second array.
 * @param {number} my - The mean of the second array.
 * @returns {number} The covariance.
 */
function covariance(x, mx, y, my) {
	if (x.length !== y.length || x.length === 0) return 0;
	return x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0) / x.length;
}

/**
 * Calculates the probability density function of a Gaussian distribution at a point.
 * @param {number} x - The point to evaluate.
 * @param {number} mx - The mean of the distribution.
 * @param {number} sx - The standard deviation of the distribution.
 * @returns {number} The probability density.
 */
function gaussianPdf(x, mx, sx) {
	if (sx === 0) return 0;
	const z = (x - mx) / sx;
	return (1 / (sx * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
}

/**
 * A data structure representing a collection of related series (data columns).
 * Handles lazy calculation and caching of statistical properties.
 */
class Series {
	/**
	 * Creates a new Series.
	 * @param {Object.<string, number[]>} values - A dictionary mapping dimension names to arrays of numbers.
	 */
	constructor(values) {
		this.values = values;

		this._stats = {
			mean: Object.create(null),
			stddev: Object.create(null),
			pdf: Object.create(null),
			// Cache for joint stats: key will be "dim1,dim2"
			covariance: Object.create(null),
			correlation: Object.create(null),
		};
	}

	/**
	 * Returns the list of available dimensions (keys).
	 * @returns {string[]} The dimension names.
	 */
	dimensions() {
		return Object.keys(this.values);
	}

	/**
	 * Returns the values for a specific dimension.
	 * @param {string} dim - The dimension name.
	 * @returns {number[]} The array of values.
	 */
	valuesOf(dim) {
		return this.values[dim] || [];
	}

	/**
	 * Calculates (or returns cached) mean for a dimension.
	 * @param {string} dim - The dimension name.
	 * @returns {number} The mean.
	 */
	mean(dim) {
		if (this._stats.mean[dim] === undefined) {
			const dimValues = this.valuesOf(dim);
			this._stats.mean[dim] = mean(dimValues);
		}
		return this._stats.mean[dim];
	}

	stddev(dim) {
		if (this._stats.stddev[dim] === undefined) {
			const dimValues = this.valuesOf(dim);
			const m = this.mean(dim);
			this._stats.stddev[dim] = stddev(dimValues, m);
		}
		return this._stats.stddev[dim];
	}

	covariance(dim1, dim2) {
		const key = `${dim1},${dim2}`;
		if (this._stats.covariance[key] === undefined) {
			const values1 = this.valuesOf(dim1);
			const values2 = this.valuesOf(dim2);
			const m1 = this.mean(dim1);
			const m2 = this.mean(dim2);
			this._stats.covariance[key] = covariance(values1, m1, values2, m2);
		}
		return this._stats.covariance[key];
	}

	correlation(dim1, dim2) {
		const key = `${dim1},${dim2}`;
		if (this._stats.correlation[key] === undefined) {
			const cov = this.covariance(dim1, dim2);
			const s1 = this.stddev(dim1);
			const s2 = this.stddev(dim2);
			this._stats.correlation[key] =
				s1 > 0 && s2 > 0 ? cov / (s1 * s2) : 0;
		}
		return this._stats.correlation[key];
	}

	pdf(dim) {
		if (this._stats.pdf[dim] === undefined) {
			const m = this.mean(dim);
			const s = this.stddev(dim);

			this._stats.pdf[dim] = function (x) {
				return gaussianPdf(x, m, s);
			};
		}

		return this._stats.pdf[dim];
	}
}

export { Series };
