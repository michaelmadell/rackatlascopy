/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_field_password_regex_min_one_uppercase = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Password must contain at least one uppercase letter`)
};

const de_field_password_regex_min_one_uppercase = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Das Passwort muss mindestens einen Großbuchstaben enthalten`)
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
export const field_password_regex_min_one_uppercase = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.field_password_regex_min_one_uppercase(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("field_password_regex_min_one_uppercase", locale)
	if (locale === "en") return en_field_password_regex_min_one_uppercase(inputs)
	return de_field_password_regex_min_one_uppercase(inputs)
};