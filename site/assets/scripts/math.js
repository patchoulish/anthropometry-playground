import { getEvidenceCategory } from "./data-utils.js";

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
 * Calculates the z-score (standard score) for a value.
 * @param {number} x - The value.
 * @param {number} mx - The mean.
 * @param {number} sx - The standard deviation.
 * @returns {number} The z-score.
 */
function zScore(x, mx, sx) {
	if (sx === 0) return 0;
	return (x - mx) / sx;
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

class BayesianClassifier {
	/**
	 * Default labels for series if none are provided.
	 * @type {string[]}
	 */
	static DEFAULT_LABELS = ["Male", "Female"];

	/**
	 * Creates a new BayesianClassifier.
	 * @param {Series[]} seriesList - The list of series classes.
	 * @param {string[]} [labels] - Optional labels for each series.
	 */
	constructor(seriesList, labels) {
		this.seriesList = seriesList;
		this.labels =
			labels ||
			BayesianClassifier.DEFAULT_LABELS.slice(0, seriesList.length);
		this.priors = seriesList.map(() => 1.0 / seriesList.length);
	}

	/**
	 * Sets the prior probabilities for each series.
	 * @param {number[]} priors - Array of probabilities summing to 1.
	 */
	setPriors(priors) {
		if (priors.length !== this.seriesList.length) {
			throw new Error("Priors length must match series length");
		}
		this.priors = priors;
	}

	/**
	 * Computes log posteriors for each series given a point.
	 * @param {Object.<string, number>} point - The data point.
	 * @returns {{ series: Series, label: string, logPosterior: number }[]} Log posteriors for each series.
	 */
	computeLogPosteriors(point) {
		const results = [];

		for (let i = 0; i < this.seriesList.length; i++) {
			const series = this.seriesList[i];
			const prior = this.priors[i];
			const label = this.labels[i];

			// Start with log prior
			let logProb = Math.log(prior);

			// Add log likelihoods for each dimension (Naive Bayes: P(x,y) = P(x)P(y))
			for (const dim in point) {
				const value = point[dim];
				const m = series.mean(dim);
				const s = series.stddev(dim);
				const p = gaussianPdf(value, m, s);

				if (p > 0) {
					logProb += Math.log(p);
				} else {
					logProb = -Infinity;
					break;
				}
			}

			results.push({ series, label, logPosterior: logProb });
		}

		return results;
	}

	/**
	 * Classifies a data point into one of the series.
	 * Uses a Naive Bayes assumption (independence between dimensions).
	 * @param {Object.<string, number>} point - The data point (map of dimension names to values).
	 * @returns {Series} The most congruent series.
	 */
	classify(point) {
		const results = this.computeLogPosteriors(point);
		let maxLogProb = -Infinity;
		let bestSeries = this.seriesList[0];

		for (const r of results) {
			if (r.logPosterior > maxLogProb) {
				maxLogProb = r.logPosterior;
				bestSeries = r.series;
			}
		}

		return bestSeries;
	}

	/**
	 * Computes per-dimension evidence details for a binary classification.
	 * Returns log-likelihood ratio, Bayes factor, and evidence category for each dimension.
	 * Assumes exactly 2 series (e.g., Male vs Female).
	 * @param {Object.<string, number>} point - The data point.
	 * @returns {Object.<string, { logLikelihoodRatio: number, bayesFactor: number, evidence: { category: string, label: string, favors: string }, zScores: { first: number, second: number } }>}
	 */
	computePerDimensionEvidence(point) {
		if (this.seriesList.length !== 2) {
			throw new Error("Per-dimension evidence requires exactly 2 series");
		}

		const [series0, series1] = this.seriesList;
		const [label0, label1] = this.labels;
		const perDimension = {};

		for (const dim in point) {
			const value = point[dim];

			const m0 = series0.mean(dim);
			const s0 = series0.stddev(dim);
			const p0 = gaussianPdf(value, m0, s0);
			const z0 = zScore(value, m0, s0);

			const m1 = series1.mean(dim);
			const s1 = series1.stddev(dim);
			const p1 = gaussianPdf(value, m1, s1);
			const z1 = zScore(value, m1, s1);

			// Log-likelihood ratio: log(P(x|class0) / P(x|class1))
			let logLikelihoodRatio;
			if (p0 > 0 && p1 > 0) {
				logLikelihoodRatio = Math.log(p0) - Math.log(p1);
			} else if (p0 > 0) {
				logLikelihoodRatio = Infinity;
			} else if (p1 > 0) {
				logLikelihoodRatio = -Infinity;
			} else {
				logLikelihoodRatio = 0;
			}

			// Bayes factor (ratio of likelihoods)
			const bayesFactor = p1 > 0 ? p0 / p1 : p0 > 0 ? Infinity : 1;

			const evidence = getEvidenceCategory(bayesFactor);

			perDimension[dim] = {
				logLikelihoodRatio,
				bayesFactor,
				evidence,
				zScores: {
					[label0]: z0,
					[label1]: z1,
				},
			};
		}

		return perDimension;
	}

	/**
	 * Classifies a data point and returns detailed results including posteriors.
	 * @param {Object.<string, number>} point - The data point.
	 * @returns {{ winner: { series: Series, label: string }, results: { series: Series, label: string, logPosterior: number, posterior: number }[], bayesFactor: number, evidence: { category: string, label: string, favors: string }, perDimension: Object }}
	 */
	classifyWithDetails(point) {
		const logPosteriors = this.computeLogPosteriors(point);

		// Convert log posteriors to normalized posteriors using log-sum-exp for numerical stability
		const maxLogP = Math.max(...logPosteriors.map((r) => r.logPosterior));
		let sumExp = 0;
		for (const r of logPosteriors) {
			if (r.logPosterior > -Infinity) {
				sumExp += Math.exp(r.logPosterior - maxLogP);
			}
		}
		const logSumExp = maxLogP + Math.log(sumExp);

		const results = logPosteriors.map((r) => ({
			series: r.series,
			label: r.label,
			logPosterior: r.logPosterior,
			posterior:
				r.logPosterior > -Infinity
					? Math.exp(r.logPosterior - logSumExp)
					: 0,
		}));

		// Find winner
		let winner = results[0];
		for (const r of results) {
			if (r.posterior > winner.posterior) {
				winner = r;
			}
		}

		// Compute overall Bayes factor (for binary classification)
		let bayesFactor = 1;
		let evidence = getEvidenceCategory(1);
		let perDimension = {};

		if (this.seriesList.length === 2) {
			// BF = P(data|class0) / P(data|class1)
			const logBf =
				logPosteriors[0].logPosterior -
				Math.log(this.priors[0]) -
				(logPosteriors[1].logPosterior - Math.log(this.priors[1]));

			bayesFactor = Math.exp(logBf);
			if (!isFinite(bayesFactor)) {
				bayesFactor =
					logPosteriors[0].logPosterior >
					logPosteriors[1].logPosterior
						? Infinity
						: 0;
			}
			evidence = getEvidenceCategory(bayesFactor);
			perDimension = this.computePerDimensionEvidence(point);
		}

		return { winner, results, bayesFactor, evidence, perDimension };
	}
}

/**
 * Linear Discriminant Analysis (LDA) classifier for binary classification.
 * Unlike Naive Bayes, LDA accounts for correlations between features
 * by using the pooled within-class covariance matrix.
 */
class LDAClassifier {
	/**
	 * Default labels for classes.
	 * @type {string[]}
	 */
	static DEFAULT_LABELS = ["Male", "Female"];

	/**
	 * Creates a new LDAClassifier.
	 * @param {Series[]} seriesList - Exactly 2 series (e.g., Male and Female).
	 * @param {string[]} [labels] - Optional labels for each series.
	 */
	constructor(seriesList, labels) {
		if (seriesList.length !== 2) {
			throw new Error("LDAClassifier requires exactly 2 series");
		}
		this.seriesList = seriesList;
		this.labels = labels || LDAClassifier.DEFAULT_LABELS.slice(0, 2);
		this.priors = [0.5, 0.5];

		this._cache = {};
	}

	/**
	 * Sets the prior probabilities for each class.
	 * @param {number[]} priors - Array of 2 probabilities summing to 1.
	 */
	setPriors(priors) {
		if (priors.length !== 2) {
			throw new Error("Priors length must be 2");
		}
		this.priors = priors;
		this._cache = {}; // Clear cache when priors change
	}

	/**
	 * Computes the pooled within-class covariance matrix for given dimensions.
	 * @param {string[]} dims - The dimension names.
	 * @returns {number[][]} The pooled covariance matrix.
	 */
	computePooledCovariance(dims) {
		const [series0, series1] = this.seriesList;
		const n0 = series0.valuesOf(dims[0]).length;
		const n1 = series1.valuesOf(dims[0]).length;
		const n = n0 + n1;

		const k = dims.length;
		const pooledCov = Array(k)
			.fill(null)
			.map(() => Array(k).fill(0));

		for (let i = 0; i < k; i++) {
			for (let j = 0; j < k; j++) {
				const cov0 = series0.covariance(dims[i], dims[j]);
				const cov1 = series1.covariance(dims[i], dims[j]);
				// Pooled covariance: weighted average by (n-1) for each class
				// Using n directly for simplicity (population covariance)
				pooledCov[i][j] = ((n0 - 1) * cov0 + (n1 - 1) * cov1) / (n - 2);
			}
		}

		return pooledCov;
	}

	/**
	 * Inverts a matrix using Gaussian elimination with partial pivoting.
	 * @param {number[][]} matrix - The matrix to invert.
	 * @returns {number[][] | null} The inverse matrix, or null if singular.
	 */
	invertMatrix(matrix) {
		const n = matrix.length;
		// Create augmented matrix [A | I]
		const aug = matrix.map((row, i) => {
			const newRow = [...row];
			for (let j = 0; j < n; j++) {
				newRow.push(i === j ? 1 : 0);
			}
			return newRow;
		});

		// Forward elimination with partial pivoting
		for (let col = 0; col < n; col++) {
			// Find pivot
			let maxRow = col;
			for (let row = col + 1; row < n; row++) {
				if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
					maxRow = row;
				}
			}

			// Swap rows
			[aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

			// Check for singular matrix
			if (Math.abs(aug[col][col]) < 1e-12) {
				return null;
			}

			// Scale pivot row
			const pivot = aug[col][col];
			for (let j = 0; j < 2 * n; j++) {
				aug[col][j] /= pivot;
			}

			// Eliminate column
			for (let row = 0; row < n; row++) {
				if (row !== col) {
					const factor = aug[row][col];
					for (let j = 0; j < 2 * n; j++) {
						aug[row][j] -= factor * aug[col][j];
					}
				}
			}
		}

		// Extract inverse from augmented matrix
		return aug.map((row) => row.slice(n));
	}

	/**
	 * Computes the LDA discriminant scores for a point.
	 * Uses the formula: score_k = x' * Σ^(-1) * μ_k - 0.5 * μ_k' * Σ^(-1) * μ_k + log(prior_k)
	 * @param {Object.<string, number>} point - The data point.
	 * @returns {{ series: Series, label: string, score: number }[]} Scores for each class.
	 */
	computeDiscriminantScores(point) {
		const dims = Object.keys(point);
		const k = dims.length;

		// Get pooled covariance and its inverse
		const pooledCov = this.computePooledCovariance(dims);
		const invCov = this.invertMatrix(pooledCov);

		if (!invCov) {
			// Fallback: if matrix is singular, use diagonal (like Naive Bayes)
			console.warn(
				"Covariance matrix is singular, falling back to diagonal",
			);
			const diagInv = Array(k)
				.fill(null)
				.map(() => Array(k).fill(0));
			for (let i = 0; i < k; i++) {
				diagInv[i][i] = pooledCov[i][i] > 0 ? 1 / pooledCov[i][i] : 0;
			}
			return this._computeScoresWithInverse(point, dims, diagInv);
		}

		return this._computeScoresWithInverse(point, dims, invCov);
	}

	/**
	 * Helper to compute scores given the inverse covariance matrix.
	 * @param {Object.<string, number>} point - The data point.
	 * @param {string[]} dims - Dimension names.
	 * @param {number[][]} invCov - Inverse covariance matrix.
	 * @returns {{ series: Series, label: string, score: number }[]}
	 */
	_computeScoresWithInverse(point, dims, invCov) {
		const k = dims.length;
		const x = dims.map((d) => point[d]);

		const results = [];

		for (let c = 0; c < 2; c++) {
			const series = this.seriesList[c];
			const label = this.labels[c];
			const prior = this.priors[c];

			// Get class means
			const mu = dims.map((d) => series.mean(d));

			// Compute invCov * mu
			const invCovMu = Array(k).fill(0);
			for (let i = 0; i < k; i++) {
				for (let j = 0; j < k; j++) {
					invCovMu[i] += invCov[i][j] * mu[j];
				}
			}

			// Compute x' * invCov * mu
			let xInvCovMu = 0;
			for (let i = 0; i < k; i++) {
				xInvCovMu += x[i] * invCovMu[i];
			}

			// Compute mu' * invCov * mu
			let muInvCovMu = 0;
			for (let i = 0; i < k; i++) {
				muInvCovMu += mu[i] * invCovMu[i];
			}

			// Discriminant score
			const score = xInvCovMu - 0.5 * muInvCovMu + Math.log(prior);

			results.push({ series, label, score });
		}

		return results;
	}

	/**
	 * Computes the Mahalanobis distance from a point to each class centroid.
	 * @param {Object.<string, number>} point - The data point.
	 * @returns {{ label: string, distance: number }[]}
	 */
	computeMahalanobisDistances(point) {
		const dims = Object.keys(point);
		const k = dims.length;
		const x = dims.map((d) => point[d]);

		const pooledCov = this.computePooledCovariance(dims);
		const invCov = this.invertMatrix(pooledCov);

		if (!invCov) {
			// Fallback to standardized Euclidean
			return this.seriesList.map((series, i) => {
				let dist = 0;
				for (const dim of dims) {
					const z = zScore(
						point[dim],
						series.mean(dim),
						series.stddev(dim),
					);
					dist += z * z;
				}
				return { label: this.labels[i], distance: Math.sqrt(dist) };
			});
		}

		const results = [];
		for (let c = 0; c < 2; c++) {
			const series = this.seriesList[c];
			const mu = dims.map((d) => series.mean(d));

			// Compute (x - mu)
			const diff = x.map((xi, i) => xi - mu[i]);

			// Compute diff' * invCov * diff
			let mahal = 0;
			for (let i = 0; i < k; i++) {
				for (let j = 0; j < k; j++) {
					mahal += diff[i] * invCov[i][j] * diff[j];
				}
			}

			results.push({ label: this.labels[c], distance: Math.sqrt(mahal) });
		}

		return results;
	}

	/**
	 * Computes per-dimension contribution to the classification.
	 * For LDA, this shows how each dimension contributes to the linear discriminant.
	 * @param {Object.<string, number>} point - The data point.
	 * @returns {Object.<string, { weight: number, contribution: number, zScores: Object }>}
	 */
	computePerDimensionEvidence(point) {
		const dims = Object.keys(point);
		const k = dims.length;
		const [series0, series1] = this.seriesList;
		const [label0, label1] = this.labels;

		const pooledCov = this.computePooledCovariance(dims);
		const invCov = this.invertMatrix(pooledCov);

		const perDimension = {};

		// If we can't invert, fall back to univariate analysis
		if (!invCov) {
			for (const dim of dims) {
				const value = point[dim];
				const m0 = series0.mean(dim);
				const s0 = series0.stddev(dim);
				const z0 = zScore(value, m0, s0);

				const m1 = series1.mean(dim);
				const s1 = series1.stddev(dim);
				const z1 = zScore(value, m1, s1);

				// Use univariate likelihood ratio
				const p0 = gaussianPdf(value, m0, s0);
				const p1 = gaussianPdf(value, m1, s1);
				const bayesFactor = p1 > 0 ? p0 / p1 : p0 > 0 ? Infinity : 1;

				perDimension[dim] = {
					weight: 1 / k,
					contribution: Math.log(bayesFactor),
					bayesFactor,
					evidence: getEvidenceCategory(bayesFactor),
					zScores: { [label0]: z0, [label1]: z1 },
				};
			}
			return perDimension;
		}

		// Compute class means difference
		const muDiff = dims.map((d) => series0.mean(d) - series1.mean(d));

		// LDA weight vector: w = invCov * (mu0 - mu1)
		const w = Array(k).fill(0);
		for (let i = 0; i < k; i++) {
			for (let j = 0; j < k; j++) {
				w[i] += invCov[i][j] * muDiff[j];
			}
		}

		// Normalize weights to sum to 1 (absolute values)
		const totalAbsWeight = w.reduce((sum, wi) => sum + Math.abs(wi), 0);

		for (let i = 0; i < k; i++) {
			const dim = dims[i];
			const value = point[dim];

			const m0 = series0.mean(dim);
			const s0 = series0.stddev(dim);
			const z0 = zScore(value, m0, s0);

			const m1 = series1.mean(dim);
			const s1 = series1.stddev(dim);
			const z1 = zScore(value, m1, s1);

			// The weight for this dimension (from LDA)
			const weight =
				totalAbsWeight > 0 ? Math.abs(w[i]) / totalAbsWeight : 1 / k;

			// Contribution to the discriminant: w_i * (x_i - midpoint)
			const midpoint = (m0 + m1) / 2;
			const contribution = w[i] * (value - midpoint);

			// Determine which class this dimension favors
			const favors = contribution >= 0 ? "first" : "second";

			// Compute Bayes factor for display (univariate, for intuition)
			const p0 = gaussianPdf(value, m0, s0);
			const p1 = gaussianPdf(value, m1, s1);
			const bayesFactor = p1 > 0 ? p0 / p1 : p0 > 0 ? Infinity : 1;

			perDimension[dim] = {
				weight,
				contribution,
				bayesFactor,
				evidence: getEvidenceCategory(bayesFactor),
				zScores: { [label0]: z0, [label1]: z1 },
			};
		}

		return perDimension;
	}

	/**
	 * Classifies a data point and returns detailed results.
	 * @param {Object.<string, number>} point - The data point.
	 * @returns {{ winner: { series: Series, label: string }, results: { series: Series, label: string, score: number, posterior: number }[], bayesFactor: number, evidence: { category: string, label: string, favors: string }, perDimension: Object, mahalanobis: { label: string, distance: number }[] }}
	 */
	classifyWithDetails(point) {
		const scores = this.computeDiscriminantScores(point);

		// Convert scores to posteriors using softmax
		const maxScore = Math.max(...scores.map((s) => s.score));
		let sumExp = 0;
		for (const s of scores) {
			sumExp += Math.exp(s.score - maxScore);
		}

		const results = scores.map((s) => ({
			series: s.series,
			label: s.label,
			score: s.score,
			posterior: Math.exp(s.score - maxScore) / sumExp,
		}));

		// Find winner
		let winner = results[0];
		for (const r of results) {
			if (r.posterior > winner.posterior) {
				winner = r;
			}
		}

		// Compute Bayes factor from posteriors
		// BF = P(class0|data) / P(class1|data) * prior1 / prior0
		// But since LDA uses priors in scores, we compute from score difference
		const scoreDiff = scores[0].score - scores[1].score;
		let bayesFactor = Math.exp(scoreDiff);
		if (!isFinite(bayesFactor)) {
			bayesFactor = scoreDiff > 0 ? Infinity : 0;
		}

		const evidence = getEvidenceCategory(bayesFactor);
		const perDimension = this.computePerDimensionEvidence(point);
		const mahalanobis = this.computeMahalanobisDistances(point);

		return {
			winner,
			results,
			bayesFactor,
			evidence,
			perDimension,
			mahalanobis,
		};
	}
}

export { Series, BayesianClassifier, LDAClassifier, getEvidenceCategory };
