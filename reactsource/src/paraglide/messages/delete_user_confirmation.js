/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_delete_user_confirmation = /** @type {(inputs: { email: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Are you sure you want to delete "${i?.email}"? This action cannot be undone.`)
};

const de_delete_user_confirmation = /** @type {(inputs: { email: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Bist Du sicher, dass Du "${i?.email}" löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ email: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const delete_user_confirmation = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.delete_user_confirmation(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("delete_user_confirmation", locale)
	if (locale === "en") return en_delete_user_confirmation(inputs)
	return de_delete_user_confirmation(inputs)
};