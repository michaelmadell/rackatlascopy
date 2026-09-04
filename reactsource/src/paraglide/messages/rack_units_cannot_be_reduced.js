/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_rack_units_cannot_be_reduced = /** @type {(inputs: { count: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Cannot reduce to ${i?.count} units`)
};

const de_rack_units_cannot_be_reduced = /** @type {(inputs: { count: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Rack-Einheiten können nicht auf ${i?.count} reduziert werden`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ count: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const rack_units_cannot_be_reduced = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.rack_units_cannot_be_reduced(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("rack_units_cannot_be_reduced", locale)
	if (locale === "en") return en_rack_units_cannot_be_reduced(inputs)
	return de_rack_units_cannot_be_reduced(inputs)
};