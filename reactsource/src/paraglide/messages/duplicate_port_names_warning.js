/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_duplicate_port_names_warning = /** @type {(inputs: { names: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Port names must be unique within a device. Duplicate: ${i?.names}`)
};

const de_duplicate_port_names_warning = /** @type {(inputs: { names: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Portnamen müssen innerhalb des Gerätes eindeutig sein. Doppelt: ${i?.names}`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ names: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const duplicate_port_names_warning = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.duplicate_port_names_warning(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("duplicate_port_names_warning", locale)
	if (locale === "en") return en_duplicate_port_names_warning(inputs)
	return de_duplicate_port_names_warning(inputs)
};