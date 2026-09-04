/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_manage_building_connections_dialog_title = /** @type {(inputs: { reference: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Building connections - ${i?.reference}`)
};

const de_manage_building_connections_dialog_title = /** @type {(inputs: { reference: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Gebäudeverbindungen - ${i?.reference}`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ reference: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const manage_building_connections_dialog_title = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.manage_building_connections_dialog_title(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("manage_building_connections_dialog_title", locale)
	if (locale === "en") return en_manage_building_connections_dialog_title(inputs)
	return de_manage_building_connections_dialog_title(inputs)
};