/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_move_conflict_reference_floor = /** @type {(inputs: { reference: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`The target already contains a floor with ID “${i?.reference}”. Please specify a new ID.`)
};

const de_move_conflict_reference_floor = /** @type {(inputs: { reference: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Das Ziel enthält bereits eine Etage mit der ID „${i?.reference}“. Bitte eine neue ID angeben.`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ reference: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const move_conflict_reference_floor = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.move_conflict_reference_floor(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("move_conflict_reference_floor", locale)
	if (locale === "en") return en_move_conflict_reference_floor(inputs)
	return de_move_conflict_reference_floor(inputs)
};