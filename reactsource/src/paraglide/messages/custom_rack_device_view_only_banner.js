/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_custom_rack_device_view_only_banner = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`You are viewing this custom rack device in read-only mode.`)
};

const de_custom_rack_device_view_only_banner = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Du siehst dieses benutzerdefinierte Rack-Gerät im Lese-Modus.`)
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
export const custom_rack_device_view_only_banner = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.custom_rack_device_view_only_banner(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("custom_rack_device_view_only_banner", locale)
	if (locale === "en") return en_custom_rack_device_view_only_banner(inputs)
	return de_custom_rack_device_view_only_banner(inputs)
};