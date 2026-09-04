/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_read_only_banner_payment_failed = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Your account is in read-only mode due to a failed payment. Please update your payment method.`)
};

const de_billing_read_only_banner_payment_failed = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Dein Konto ist im Lese-Modus aufgrund einer fehlgeschlagenen Zahlung. Bitte aktualisiere Deine Zahlungsmethode.`)
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
export const billing_read_only_banner_payment_failed = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_read_only_banner_payment_failed(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_read_only_banner_payment_failed", locale)
	if (locale === "en") return en_billing_read_only_banner_payment_failed(inputs)
	return de_billing_read_only_banner_payment_failed(inputs)
};