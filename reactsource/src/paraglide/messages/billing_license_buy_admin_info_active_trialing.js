/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_license_buy_admin_info_active_trialing = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This license will be charged starting from the next billing cycle.`)
};

const de_billing_license_buy_admin_info_active_trialing = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Die Lizenz wird ab der nächsten Abrechnungsperiode verrechnet.`)
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
export const billing_license_buy_admin_info_active_trialing = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_license_buy_admin_info_active_trialing(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_license_buy_admin_info_active_trialing", locale)
	if (locale === "en") return en_billing_license_buy_admin_info_active_trialing(inputs)
	return de_billing_license_buy_admin_info_active_trialing(inputs)
};