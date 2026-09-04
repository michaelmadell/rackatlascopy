/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_payment_method_expired = /** @type {(inputs: { expMonth: NonNullable<unknown>, expYear: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Expired ${i?.expMonth}/${i?.expYear}`)
};

const de_billing_payment_method_expired = /** @type {(inputs: { expMonth: NonNullable<unknown>, expYear: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Abgelaufen ${i?.expMonth}/${i?.expYear}`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ expMonth: NonNullable<unknown>, expYear: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const billing_payment_method_expired = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_payment_method_expired(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_payment_method_expired", locale)
	if (locale === "en") return en_billing_payment_method_expired(inputs)
	return de_billing_payment_method_expired(inputs)
};