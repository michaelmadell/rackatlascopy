/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_no_resources_found = /** @type {(inputs: { resources.toLowerCase(): NonNullable<unknown>, resources: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`No ${i?.resources.toLowerCase()} found`)
};

const de_no_resources_found = /** @type {(inputs: { resources.toLowerCase(): NonNullable<unknown>, resources: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Keine ${i?.resources} gefunden`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ resources.toLowerCase(): NonNullable<unknown>, resources: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const no_resources_found = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.no_resources_found(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("no_resources_found", locale)
	if (locale === "en") return en_no_resources_found(inputs)
	return de_no_resources_found(inputs)
};