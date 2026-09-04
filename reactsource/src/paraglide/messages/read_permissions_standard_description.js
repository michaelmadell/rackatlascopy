/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_read_permissions_standard_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The user will automatically receive read permissions to all locations (and their contents), as well as VLANs and WLANs.`)
};

const de_read_permissions_standard_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Der Benutzer erhält automatisch Leseberechtigungen auf alle Standorte (und deren Inhalte) sowie VLANs und WLANs.`)
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
export const read_permissions_standard_description = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.read_permissions_standard_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("read_permissions_standard_description", locale)
	if (locale === "en") return en_read_permissions_standard_description(inputs)
	return de_read_permissions_standard_description(inputs)
};