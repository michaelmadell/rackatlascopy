/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_license_needed_non_admin = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This connection will activate a new rack, which requires a rack license. There are no unused licenses available. Please ask your account administrator to add licenses.`)
};

const de_billing_license_needed_non_admin = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Diese Verbindung aktiviert ein neues Rack, wofür eine Rack-Lizenz benötigt wird. Es sind keine ungenutzten Lizenzen verfügbar. Bitte wende Dich an Deinen Kontoadministrator.`)
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
export const billing_license_needed_non_admin = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_license_needed_non_admin(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_license_needed_non_admin", locale)
	if (locale === "en") return en_billing_license_needed_non_admin(inputs)
	return de_billing_license_needed_non_admin(inputs)
};