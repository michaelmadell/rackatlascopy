/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_patchbox_cable_length_description_many = /** @type {(inputs: { count: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.count} Patchbox cassettes would have to reach further than their cables allow.`)
};

const de_patchbox_cable_length_description_many = /** @type {(inputs: { count: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.count} Patchbox-Kassetten müssten weiter reichen, als ihre Kabel zulassen.`)
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
export const patchbox_cable_length_description_many = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.patchbox_cable_length_description_many(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("patchbox_cable_length_description_many", locale)
	if (locale === "en") return en_patchbox_cable_length_description_many(inputs)
	return de_patchbox_cable_length_description_many(inputs)
};