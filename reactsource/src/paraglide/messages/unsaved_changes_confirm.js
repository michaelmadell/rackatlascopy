/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_unsaved_changes_confirm = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`You have unsaved changes. Are you sure you want to leave without saving?`)
};

const de_unsaved_changes_confirm = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Du hast ungespeicherte Änderungen. Bist Du sicher, dass Du ohne zu speichern fortfahren möchtest?`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const unsaved_changes_confirm = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.unsaved_changes_confirm(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("unsaved_changes_confirm", locale)
	if (locale === "en") return en_unsaved_changes_confirm(inputs)
	return de_unsaved_changes_confirm(inputs)
};