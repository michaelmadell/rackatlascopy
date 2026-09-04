/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_patchbox_cable_length_upgrade_cassette = /** @type {(inputs: { number: NonNullable<unknown>, reference: NonNullable<unknown>, length: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Set cassette ${i?.number} of ${i?.reference} to ${i?.length}`)
};

const de_patchbox_cable_length_upgrade_cassette = /** @type {(inputs: { number: NonNullable<unknown>, reference: NonNullable<unknown>, length: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Kassette ${i?.number} von ${i?.reference} auf ${i?.length} setzen`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ number: NonNullable<unknown>, reference: NonNullable<unknown>, length: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const patchbox_cable_length_upgrade_cassette = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.patchbox_cable_length_upgrade_cassette(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("patchbox_cable_length_upgrade_cassette", locale)
	if (locale === "en") return en_patchbox_cable_length_upgrade_cassette(inputs)
	return de_patchbox_cable_length_upgrade_cassette(inputs)
};