# Copilot Instructions

## Using the development environment

Nix is used to manage the development environment for this project.
The development environment is applied as a Nix profile at startup.
All required tools (including `just`, `npx`, and others) are available directly in your PATH.

Command recipes are defined in the `justfile` at the root of the repository.
Run `just` to see a list of available recipes.
Do not run `just serve` as this is an interactive command meant for local development only.

## Pre-commit checks

This project uses pre-commit hooks to enforce code quality and consistency.
Always run `just format` before committing your changes to ensure code is formatted consistently, otherwise the pre-commit check may fail.
