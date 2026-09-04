/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_blocked_banner_payment_failed = /** @type {(inputs: { date: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Your account is blocked due to a failed payment and scheduled for deletion on ${i?.date}. Please update your payment method immediately.`)
};

const de_billing_blocked_banner_payment_failed = /** @type {(inputs: { date: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Dein Konto ist aufgrund einer fehlgeschlagenen Zahlung gesperrt und wird am ${i?.date} gelöscht. Bitte aktualisiere sofort Deine Zahlungsmethode.`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ date: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const billing_blocked_banner_payment_failed = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_blocked_banner_payment_failed(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_blocked_banner_payment_failed", locale)
	if (locale === "en") return en_billing_blocked_banner_payment_failed(inputs)
	return de_billing_blocked_banner_payment_failed(inputs)
};