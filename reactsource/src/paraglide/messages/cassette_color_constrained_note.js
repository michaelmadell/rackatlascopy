/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_cassette_color_constrained_note = /** @type {(inputs: { reference: NonNullable<unknown>, number: NonNullable<unknown>, color: NonNullable<unknown>, color2: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.reference} cassette ${i?.number} is ${i?.color} — only shades of ${i?.color2} are available.`)
};

const de_cassette_color_constrained_note = /** @type {(inputs: { reference: NonNullable<unknown>, number: NonNullable<unknown>, color: NonNullable<unknown>, color2: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.reference} Kassette ${i?.number} ist ${i?.color} — nur Abstufungen von ${i?.color2} sind verfügbar.`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ reference: NonNullable<unknown>, number: NonNullable<unknown>, color: NonNullable<unknown>, color2: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const cassette_color_constrained_note = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.cassette_color_constrained_note(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("cassette_color_constrained_note", locale)
	if (locale === "en") return en_cassette_color_constrained_note(inputs)
	return de_cassette_color_constrained_note(inputs)
};