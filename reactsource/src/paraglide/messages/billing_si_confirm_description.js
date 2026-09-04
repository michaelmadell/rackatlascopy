/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_si_confirm_description = /** @type {(inputs: { price: NonNullable<unknown>, interval: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`By applying, you agree to the System Integrator pricing. Upon acceptance, your subscription will change to ${i?.price}${i?.interval}. Subscription changes will be frozen while your application is pending.`)
};

const de_billing_si_confirm_description = /** @type {(inputs: { price: NonNullable<unknown>, interval: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Mit der Beantragung stimmst Du den System-Integrator-Preisen zu. Bei Annahme ändert sich Dein Abonnement auf ${i?.price}${i?.interval}. Abonnement-Änderungen werden gesperrt, solange Dein Antrag aussteht.`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ price: NonNullable<unknown>, interval: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const billing_si_confirm_description = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_si_confirm_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_si_confirm_description", locale)
	if (locale === "en") return en_billing_si_confirm_description(inputs)
	return de_billing_si_confirm_description(inputs)
};