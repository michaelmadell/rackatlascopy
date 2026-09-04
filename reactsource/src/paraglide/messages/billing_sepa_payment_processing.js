/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_sepa_payment_processing = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`A SEPA payment is being processed. Some subscription actions are temporarily unavailable until your bank settles the debit.`)
};

const de_billing_sepa_payment_processing = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Eine SEPA-Zahlung wird verarbeitet. Einige Abonnement-Aktionen sind vorübergehend nicht verfügbar, bis Deine Bank den Einzug bestätigt.`)
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
export const billing_sepa_payment_processing = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_sepa_payment_processing(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_sepa_payment_processing", locale)
	if (locale === "en") return en_billing_sepa_payment_processing(inputs)
	return de_billing_sepa_payment_processing(inputs)
};