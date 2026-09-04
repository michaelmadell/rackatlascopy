/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_location_update_address_description = /** @type {(inputs: { address: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`You have set new coordinates for this location. Would you also like to update the address to "${i?.address}"?`)
};

const de_location_update_address_description = /** @type {(inputs: { address: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Du hast neue Koordinaten für diesen Standort gesetzt. Möchtest Du auch die Adresse in "${i?.address}" ändern?`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ address: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const location_update_address_description = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.location_update_address_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("location_update_address_description", locale)
	if (locale === "en") return en_location_update_address_description(inputs)
	return de_location_update_address_description(inputs)
};