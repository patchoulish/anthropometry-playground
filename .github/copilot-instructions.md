# Copilot Instructions

## Using the development environment

Nix is used to manage the development environment for this project.
The development environment is applied as a Nix profile at startup.
All required tools (including `just`, `npx`, and others) are available directly in your PATH.

Command recipes are defined in the `justfile` at the root of the repository.
Run `just` to see a list of available recipes.

## Build system

This is an Eleventy-based static site project. Key commands:

- `just build` - Builds the site to `_site/` directory using Eleventy
- `just serve` - Starts Eleventy's development server with hot-reload (interactive, runs in background)
- `just clean` - Removes the `_site/` build directory

The build process:

- Compiles Handlebars templates (`.hbs`) to HTML
- Compiles SCSS to CSS
- Converts CSV data files to JSON in columnar format
- Copies static assets (scripts and data files) to `_site/`

When testing changes, you can:

1. Run `just build` to build the site
2. Use the built files in `_site/` for validation
3. For interactive development, you may start `just serve` as a background process, which runs Eleventy's dev server with file watching and auto-reload

## Pre-commit checks

This project uses pre-commit hooks to enforce code quality and consistency.
Always run `just format` before committing your changes to ensure code is formatted consistently, otherwise the pre-commit check may fail.
