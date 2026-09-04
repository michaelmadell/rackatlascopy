/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_read_permissions_systemintegrator_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Please select the tenants the user should receive read permissions to.`)
};

const de_read_permissions_systemintegrator_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Wähle die Mandanten aus, auf die der Benutzer Leseberechtigungen erhalten soll.`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{}} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const read_permissions_systemintegrator_description = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.read_permissions_systemintegrator_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("read_permissions_systemintegrator_description", locale)
	if (locale === "en") return en_read_permissions_systemintegrator_description(inputs)
	return de_read_permissions_systemintegrator_description(inputs)
};