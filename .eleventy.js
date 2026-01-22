import path from "node:path";
import * as sass from "sass";
import handlebarsPlugin from "@11ty/eleventy-plugin-handlebars";
import csvToJson from "convert-csv-to-json";

export default async function (eleventyConfig) {
	// Output directory: _site

	// Add Handlebars support.
	eleventyConfig.addPlugin(handlebarsPlugin);

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
					// Convert key to lowercase and strip underscores and hyphens.
					let normalizedKey = key.toLowerCase().replace(/[_-]/g, "");

					// Fix specific default keys.
					if (normalizedKey === "weightkg") {
						normalizedKey = "weight";
					}

					if (!(normalizedKey in columnarResult)) {
						columnarResult[normalizedKey] = [];
					}

					// Convert numeric values from strings to numbers.
					let numericValue = Number(value);
					if (!isNaN(numericValue)) {
						columnarResult[normalizedKey].push(numericValue);
					} else {
						columnarResult[normalizedKey].push(value);
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
		"assets/data/ansur1/measurements.json":
			"assets/data/ansur1/measurements.json",
		"assets/data/ansur2/measurements.json":
			"assets/data/ansur2/measurements.json",
		"robots.txt": "robots.txt",
		"sitemap.xml": "sitemap.xml",
		"site.webmanifest": "site.webmanifest",
		"favicon.ico": "favicon.ico",
		"favicon.svg": "favicon.svg",
		"apple-touch-icon.png": "apple-touch-icon.png",
		"android-chrome-192x192.png": "android-chrome-192x192.png",
		"android-chrome-512x512.png": "android-chrome-512x512.png",
	});

	eleventyConfig.setChokidarConfig({
		usePolling: true,
		interval: 1000,
	});
}
