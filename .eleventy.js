import path from "node:path";
import * as sass from "sass";

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

	// Ignore GitHub-related configuration and content files.
	eleventyConfig.ignores.add(".github/**");

	// Register "scss" as a template format.
	eleventyConfig.addTemplateFormats("scss");

	// Passthrough copy for static assets.
	eleventyConfig.addPassthroughCopy("assets/scripts/");

	eleventyConfig.addPassthroughCopy({
		"node_modules/choices.js/public/assets/scripts/choices.min.js":
			"assets/scripts/vendor/choices.min.js",
		"node_modules/choices.js/public/assets/styles/choices.min.css":
			"assets/styles/vendor/choices.min.css",
	});
}
