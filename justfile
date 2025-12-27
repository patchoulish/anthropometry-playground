# List available recipes.
[private]
default:
	@just --list --unsorted

# Serve the repository locally.
[group('dev')]
serve:
	npx '@11ty/eleventy' --serve

# Build the repository.
[group('dev')]
build:
	npx '@11ty/eleventy'

# Clean the repository of build artifacts.
[group('util')]
clean:
	rm -rf _site

# Format the repository.
[group('util')]
format:
	treefmt

# Check the formatting for the repository.
[group('util')]
format-check:
	treefmt --fail-on-change --no-cache
