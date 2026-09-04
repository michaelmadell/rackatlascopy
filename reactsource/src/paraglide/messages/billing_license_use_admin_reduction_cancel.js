/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_license_use_admin_reduction_cancel = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This connection will activate a new rack, which requires a rack license. One of your unused licenses will be used and your scheduled license reduction will be cancelled.`)
};

const de_billing_license_use_admin_reduction_cancel = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Diese Verbindung aktiviert ein neues Rack, wofür eine Rack-Lizenz benötigt wird. Eine Deiner ungenutzten Lizenzen wird verwendet und Deine geplante Lizenzreduzierung wird storniert.`)
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
export const billing_license_use_admin_reduction_cancel = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_license_use_admin_reduction_cancel(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_license_use_admin_reduction_cancel", locale)
	if (locale === "en") return en_billing_license_use_admin_reduction_cancel(inputs)
	return de_billing_license_use_admin_reduction_cancel(inputs)
};