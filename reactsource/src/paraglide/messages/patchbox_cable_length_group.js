/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_patchbox_cable_length_group = /** @type {(inputs: { reference: NonNullable<unknown>, cassettes: NonNullable<unknown>, span: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.reference} — cassettes ${i?.cassettes} (up to ${i?.span} rack units)`)
};

const de_patchbox_cable_length_group = /** @type {(inputs: { reference: NonNullable<unknown>, cassettes: NonNullable<unknown>, span: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.reference} — Kassetten ${i?.cassettes} (bis zu ${i?.span} Höheneinheiten)`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ reference: NonNullable<unknown>, cassettes: NonNullable<unknown>, span: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const patchbox_cable_length_group = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.patchbox_cable_length_group(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("patchbox_cable_length_group", locale)
	if (locale === "en") return en_patchbox_cable_length_group(inputs)
	return de_patchbox_cable_length_group(inputs)
};