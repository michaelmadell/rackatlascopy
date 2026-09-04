/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_cassette_color_confirm_row = /** @type {(inputs: { reference: NonNullable<unknown>, number: NonNullable<unknown>, color: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.reference} cassette ${i?.number} — not set → ${i?.color}`)
};

const de_cassette_color_confirm_row = /** @type {(inputs: { reference: NonNullable<unknown>, number: NonNullable<unknown>, color: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.reference} Kassette ${i?.number} — nicht gesetzt → ${i?.color}`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ reference: NonNullable<unknown>, number: NonNullable<unknown>, color: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const cassette_color_confirm_row = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.cassette_color_confirm_row(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("cassette_color_confirm_row", locale)
	if (locale === "en") return en_cassette_color_confirm_row(inputs)
	return de_cassette_color_confirm_row(inputs)
};