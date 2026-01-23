/*
	Copyright 2025-2026 patchoulish

	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at

		http://www.apache.org/licenses/LICENSE-2.0

	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.
*/

import { EventName, ThemeChangedEventData } from "./events.js";

const themeStorageKey = "theme-preference";

/**
 * Dispatches a global event when the theme changes.
 * @param {string} theme - The new theme ('light' or 'dark').
 */
const notifyThemeChange = (theme) => {
	window.dispatchEvent(
		new CustomEvent(EventName.THEME_CHANGED, {
			detail: new ThemeChangedEventData(theme),
		}),
	);
};

/**
 * Handles the click event on the theme toggle button.
 * Toggles the theme state and persists it.
 */
const onThemeToggleClick = () => {
	// Toggle between light and dark themes.
	theme.value = theme.value === "light" ? "dark" : "light";

	setThemePreference();
};

/**
 * Retrieves the preferred theme from local storage or system preferences.
 * @returns {string} The preferred theme ('light' or 'dark').
 */
const getThemePreference = () => {
	var themeStorageValue = localStorage.getItem(themeStorageKey);

	if (themeStorageValue) {
		return themeStorageValue;
	} else {
		return window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
	}
};

export { getThemePreference };

/**
 * Persists the current theme to local storage and updates the UI.
 */
const setThemePreference = () => {
	localStorage.setItem(themeStorageKey, theme.value);

	refreshTheme();
	notifyThemeChange(theme.value);
};

/**
 * Updates the document attributes and toggle button state to match the current theme.
 */
const refreshTheme = () => {
	document.firstElementChild.setAttribute("data-theme", theme.value);

	document
		.querySelector("[data-theme-toggle]")
		?.setAttribute(
			"aria-label",
			`Switch to ${theme.value === "light" ? "dark" : "light"} theme`,
		);
};

const theme = {
	value: getThemePreference(),
};

refreshTheme();

window.addEventListener("load", () => {
	refreshTheme();

	document
		.querySelector("[data-theme-toggle]")
		.addEventListener("click", onThemeToggleClick);

	window
		.matchMedia("(prefers-color-scheme: dark)")
		.addEventListener("change", ({ matches: isDark }) => {
			theme.value = isDark ? "dark" : "light";
			setThemePreference();
		});
});
