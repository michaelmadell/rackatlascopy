/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_write_permissions_requires_read_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Please grant read permissions to at least one tenant first to be able to assign write permissions.`)
};

const de_write_permissions_requires_read_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Bitte gewähre dem Benutzer zuerst Leseberechtigungen für mindestens einen Mandanten, um Schreibberechtigungen zuweisen zu können.`)
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
export const write_permissions_requires_read_description = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.write_permissions_requires_read_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("write_permissions_requires_read_description", locale)
	if (locale === "en") return en_write_permissions_requires_read_description(inputs)
	return de_write_permissions_requires_read_description(inputs)
};