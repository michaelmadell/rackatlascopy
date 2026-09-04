/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_duplicate_target_port_mappings_detected = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Duplicate target port mappings detected. Please check your connections and try again.`)
};

const de_duplicate_target_port_mappings_detected = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Doppelte Zielport-Zuordnungen gefunden. Bitte überprüfe Deine Verbindungen und versuche es erneut.`)
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
export const duplicate_target_port_mappings_detected = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.duplicate_target_port_mappings_detected(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("duplicate_target_port_mappings_detected", locale)
	if (locale === "en") return en_duplicate_target_port_mappings_detected(inputs)
	return de_duplicate_target_port_mappings_detected(inputs)
};