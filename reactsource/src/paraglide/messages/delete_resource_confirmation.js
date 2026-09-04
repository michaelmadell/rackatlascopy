/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_delete_resource_confirmation = /** @type {(inputs: { resource.toLowerCase(): NonNullable<unknown>, resource: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Are you sure you want to delete this ${i?.resource.toLowerCase()}? This action cannot be undone.`)
};

const de_delete_resource_confirmation = /** @type {(inputs: { resource.toLowerCase(): NonNullable<unknown>, resource: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Bist Du sicher, dass Du diese ${i?.resource} löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.`)
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
export const delete_resource_confirmation = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.delete_resource_confirmation(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("delete_resource_confirmation", locale)
	if (locale === "en") return en_delete_resource_confirmation(inputs)
	return de_delete_resource_confirmation(inputs)
};