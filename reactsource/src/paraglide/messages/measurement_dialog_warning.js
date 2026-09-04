/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_measurement_dialog_warning = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Setting the scale will affect all existing room shapes and device positions. Please verify their placement after saving.`)
};

const de_measurement_dialog_warning = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Das Setzen des Maßstabs wird alle bestehenden Raumformen und Gerätepositionen beeinflussen. Bitte prüfe nach dem Speichern ihre Platzierung.`)
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
export const measurement_dialog_warning = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.measurement_dialog_warning(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("measurement_dialog_warning", locale)
	if (locale === "en") return en_measurement_dialog_warning(inputs)
	return de_measurement_dialog_warning(inputs)
};