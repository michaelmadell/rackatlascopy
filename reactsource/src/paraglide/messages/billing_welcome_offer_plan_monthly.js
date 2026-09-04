/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_welcome_offer_plan_monthly = /** @type {(inputs: { offer: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.offer} on the monthly plan`)
};

const de_billing_welcome_offer_plan_monthly = /** @type {(inputs: { offer: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.offer} bei monatlicher Zahlung`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ offer: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const billing_welcome_offer_plan_monthly = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_welcome_offer_plan_monthly(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_welcome_offer_plan_monthly", locale)
	if (locale === "en") return en_billing_welcome_offer_plan_monthly(inputs)
	return de_billing_welcome_offer_plan_monthly(inputs)
};