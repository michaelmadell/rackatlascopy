/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_prefix_hint = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`1-4 characters, uppercase letters and numbers only. Must be unique across all device type ID prefixes.`)
};

const de_prefix_hint = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`1-4 Zeichen, nur Großbuchstaben und Zahlen. Muss über alle ID-Präfixe für Gerätetypen hinweg eindeutig sein.`)
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
export const prefix_hint = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.prefix_hint(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("prefix_hint", locale)
	if (locale === "en") return en_prefix_hint(inputs)
	return de_prefix_hint(inputs)
};