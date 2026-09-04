/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_n_permissions = /** @type {(inputs: { count: NonNullable<unknown>, count === 1 ? 'permission' : 'permissions': NonNullable<unknown>, count === 1 ? 'Berechtigung' : 'Berechtigungen': NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.count} ${i?.count === 1 ? 'permission' : 'permissions'}`)
};

const de_n_permissions = /** @type {(inputs: { count: NonNullable<unknown>, count === 1 ? 'permission' : 'permissions': NonNullable<unknown>, count === 1 ? 'Berechtigung' : 'Berechtigungen': NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.count} ${i?.count === 1 ? 'Berechtigung' : 'Berechtigungen'}`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ count: NonNullable<unknown>, count === 1 ? 'permission' : 'permissions': NonNullable<unknown>, count === 1 ? 'Berechtigung' : 'Berechtigungen': NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const n_permissions = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.n_permissions(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("n_permissions", locale)
	if (locale === "en") return en_n_permissions(inputs)
	return de_n_permissions(inputs)
};