/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_welcome_offer_both = /** @type {(inputs: { monthly: NonNullable<unknown>, yearly: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.monthly} or ${i?.yearly}`)
};

const de_billing_welcome_offer_both = /** @type {(inputs: { monthly: NonNullable<unknown>, yearly: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.monthly} oder ${i?.yearly}`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ monthly: NonNullable<unknown>, yearly: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const billing_welcome_offer_both = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_welcome_offer_both(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_welcome_offer_both", locale)
	if (locale === "en") return en_billing_welcome_offer_both(inputs)
	return de_billing_welcome_offer_both(inputs)
};