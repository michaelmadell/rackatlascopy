/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_reset_port_names_description = /** @type {(inputs: { prefix: NonNullable<unknown>, max: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`ID prefix "${i?.prefix}" would make one or more custom port names longer than ${i?.max} characters. Reset the affected port names to their defaults?`)
};

const de_reset_port_names_description = /** @type {(inputs: { prefix: NonNullable<unknown>, max: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Mit dem ID-Präfix "${i?.prefix}" würden ein oder mehrere benutzerdefinierte Portnamen länger als ${i?.max} Zeichen sein. Betroffene Portnamen auf die Standardwerte zurücksetzen?`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ prefix: NonNullable<unknown>, max: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const reset_port_names_description = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.reset_port_names_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("reset_port_names_description", locale)
	if (locale === "en") return en_reset_port_names_description(inputs)
	return de_reset_port_names_description(inputs)
};