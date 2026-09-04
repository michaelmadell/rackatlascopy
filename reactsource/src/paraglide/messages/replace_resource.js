/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_replace_resource = /** @type {(inputs: { resource.toLowerCase(): NonNullable<unknown>, resource: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Replace ${i?.resource.toLowerCase()}`)
};

const de_replace_resource = /** @type {(inputs: { resource.toLowerCase(): NonNullable<unknown>, resource: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.resource} ersetzen`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ resource.toLowerCase(): NonNullable<unknown>, resource: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const replace_resource = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.replace_resource(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("replace_resource", locale)
	if (locale === "en") return en_replace_resource(inputs)
	return de_replace_resource(inputs)
};