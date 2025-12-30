function mean(x) {
	return x.reduce((a, b) => a + b, 0) / x.length;
}

function stddev(x, mx) {
	return Math.sqrt(x.reduce((s, v) => s + (v - mx) ** 2, 0) / x.length);
}

class Series {
	constructor(values) {
		this.values = values;

		this._stats = {
			mean: Object.create(null),
			stddev: Object.create(null),
		};
	}

	dimensions() {
		return Object.keys(this.values);
	}

	valuesOf(dim) {
		return this.values[dim];
	}

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
}

export { Series };
