/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_port_name_hint = /** @type {(inputs: { max: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Max. ${i?.max} characters (including the optional group prefix). Must be unique within the device.`)
};

const de_port_name_hint = /** @type {(inputs: { max: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Max. ${i?.max} Zeichen (inkl. optionalem Gruppen-Präfix). Muss innerhalb des Gerätes eindeutig sein.`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ max: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const port_name_hint = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.port_name_hint(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("port_name_hint", locale)
	if (locale === "en") return en_port_name_hint(inputs)
	return de_port_name_hint(inputs)
};