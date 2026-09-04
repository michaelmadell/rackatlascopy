/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_no_available_source_port_found = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`No available source port found. If the device has additional ports, please first add them via the sidebar.`)
};

const de_no_available_source_port_found = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Kein verfügbarer Ausgangs-Port gefunden. Wenn das Gerät über weitere Ports verfügt, füge sie bitte zuerst über die Sidebar hinzu.`)
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
export const no_available_source_port_found = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.no_available_source_port_found(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("no_available_source_port_found", locale)
	if (locale === "en") return en_no_available_source_port_found(inputs)
	return de_no_available_source_port_found(inputs)
};