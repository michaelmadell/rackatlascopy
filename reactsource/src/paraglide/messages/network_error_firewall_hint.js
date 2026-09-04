/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_network_error_firewall_hint = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`If you're on a corporate network, a firewall may be blocking access to Patchdocs. Please ask your IT team to whitelist *.patchdocs.io.`)
};

const de_network_error_firewall_hint = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Falls Du Dich in einem Firmennetzwerk befindest, blockiert möglicherweise eine Firewall den Zugriff auf Patchdocs. Bitte Dein IT-Team, *.patchdocs.io freizuschalten.`)
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
export const network_error_firewall_hint = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.network_error_firewall_hint(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("network_error_firewall_hint", locale)
	if (locale === "en") return en_network_error_firewall_hint(inputs)
	return de_network_error_firewall_hint(inputs)
};