import path from "node:path";
import * as sass from "sass";
import csvToJson from "convert-csv-to-json";

export default async function (eleventyConfig) {
	// Output directory: _site

	// Add sass support.
	eleventyConfig.addExtension("scss", {
		outputFileExtension: "css",

		// Opt-out of eleventy's layouts.
		useLayouts: false,

		compile: async function (inputContent, inputPath) {
			let parsedPath = path.parse(inputPath);

			// Ignore partials (files starting with an underscore).
			if (parsedPath.name.startsWith("_")) {
				return;
			}

			let result = sass.compileString(inputContent, {
				loadPaths: [
					parsedPath.dir || ".",
					this.config.dir.includes,
					"node_modules",
				],
				// Silently ignore deprecation warnings.
				quietDeps: true,
			});

			// Map dependencies for incremental builds.
			this.addDependencies(inputPath, result.loadedUrls);

			return async (data) => {
				return result.css;
			};
		},
	});

	// Add csv-to-json support.
	eleventyConfig.addExtension("csv", {
		outputFileExtension: "json",

		// Opt-out of eleventy's layouts.
		useLayouts: false,

		compile: async function (inputContent, inputPath) {
			let parsedPath = path.parse(inputPath);

			let result = csvToJson
				.fieldDelimiter(",")
				.trimHeaderFieldWhiteSpace(true)
				.getJsonFromCsv(inputPath);

			let columnarResult = {};
			for (let row of result) {
				for (let [key, value] of Object.entries(row)) {
					if (!(key in columnarResult)) {
						columnarResult[key] = [];
					}
					// Convert numeric values from strings to numbers.
					let numericValue = Number(value);
					if (!isNaN(numericValue)) {
						columnarResult[key].push(numericValue);
					} else {
						columnarResult[key].push(value);
					}
				}
			}

			result = columnarResult;

			return async (data) => {
				return JSON.stringify(result);
			};
		},
	});

	// Ignore GitHub-related configuration and content files.
	eleventyConfig.ignores.add(".github/**");

	// Register "scss" as a template format.
	eleventyConfig.addTemplateFormats("scss");
	// Register "csv" as a template format.
	eleventyConfig.addTemplateFormats("csv");

	// Passthrough copy for static assets.
	eleventyConfig.addPassthroughCopy({
		"assets/scripts/": "assets/scripts/",
		"assets/data/ansur2/measurements.json":
			"assets/data/ansur2/measurements.json",
	});

	eleventyConfig.addPassthroughCopy({
		"node_modules/choices.js/public/assets/scripts/choices.min.js":
			"assets/scripts/vendor/choices.min.js",
		"node_modules/choices.js/public/assets/styles/choices.min.css":
			"assets/styles/vendor/choices.min.css",
	});

	eleventyConfig.setChokidarConfig({
		usePolling: true,
		interval: 1000,
	});
}
