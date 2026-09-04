/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_next_renewal_charge = /** @type {(inputs: { amount: NonNullable<unknown>, date: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Next renewal: you will be charged ${i?.amount} on ${i?.date}`)
};

const de_billing_next_renewal_charge = /** @type {(inputs: { amount: NonNullable<unknown>, date: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Nächste Verlängerung: Dir werden ${i?.amount} am ${i?.date} berechnet`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ amount: NonNullable<unknown>, date: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const billing_next_renewal_charge = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_next_renewal_charge(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_next_renewal_charge", locale)
	if (locale === "en") return en_billing_next_renewal_charge(inputs)
	return de_billing_next_renewal_charge(inputs)
};