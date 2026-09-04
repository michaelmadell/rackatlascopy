/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_cassette_color_conflict_cassettes = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This connection would join Patchbox cassettes with different cable colours into one connection chain. A connection chain must be one colour end to end.`)
};

const de_cassette_color_conflict_cassettes = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Diese Verbindung würde Patchbox-Kassetten mit unterschiedlichen Kabelfarben zu einer Verbindungskette zusammenführen. Eine Verbindungskette muss durchgehend eine Farbe haben.`)
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
export const cassette_color_conflict_cassettes = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.cassette_color_conflict_cassettes(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("cassette_color_conflict_cassettes", locale)
	if (locale === "en") return en_cassette_color_conflict_cassettes(inputs)
	return de_cassette_color_conflict_cassettes(inputs)
};