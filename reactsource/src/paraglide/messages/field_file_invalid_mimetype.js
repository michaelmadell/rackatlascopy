/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_field_file_invalid_mimetype = /** @type {(inputs: { types: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Please upload a valid file type: ${i?.types}`)
};

const de_field_file_invalid_mimetype = /** @type {(inputs: { types: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Bitte lade ein gültiges Dateiformat hoch: ${i?.types}`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ types: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const field_file_invalid_mimetype = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.field_file_invalid_mimetype(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("field_file_invalid_mimetype", locale)
	if (locale === "en") return en_field_file_invalid_mimetype(inputs)
	return de_field_file_invalid_mimetype(inputs)
};