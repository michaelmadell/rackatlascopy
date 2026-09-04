/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_custom_rack_device_save_rebuild_success = /** @type {(inputs: { count: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Custom rack device updated. ${i?.count} device(s) rebuilt.`)
};

const de_custom_rack_device_save_rebuild_success = /** @type {(inputs: { count: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Benutzerdefiniertes Rack-Gerät aktualisiert. ${i?.count} Gerät(e) neu erstellt.`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ count: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const custom_rack_device_save_rebuild_success = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.custom_rack_device_save_rebuild_success(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("custom_rack_device_save_rebuild_success", locale)
	if (locale === "en") return en_custom_rack_device_save_rebuild_success(inputs)
	return de_custom_rack_device_save_rebuild_success(inputs)
};