/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_move_conflict_both = /** @type {(inputs: { level: NonNullable<unknown>, reference: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`The target already contains a floor on level ${i?.level} with ID “${i?.reference}”. Please specify a new ID and level.`)
};

const de_move_conflict_both = /** @type {(inputs: { level: NonNullable<unknown>, reference: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Das Ziel enthält bereits eine Etage auf Ebene ${i?.level} mit der ID „${i?.reference}“. Bitte eine neue ID und Ebene angeben.`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ level: NonNullable<unknown>, reference: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const move_conflict_both = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.move_conflict_both(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("move_conflict_both", locale)
	if (locale === "en") return en_move_conflict_both(inputs)
	return de_move_conflict_both(inputs)
};