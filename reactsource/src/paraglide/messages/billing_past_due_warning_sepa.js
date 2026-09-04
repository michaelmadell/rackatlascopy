/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_past_due_warning_sepa = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Your last SEPA payment couldn't be collected. Please update your payment method or check with your bank.`)
};

const de_billing_past_due_warning_sepa = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Deine letzte SEPA-Zahlung konnte nicht eingezogen werden. Bitte aktualisiere Deine Zahlungsmethode oder kläre die Situation mit Deiner Bank.`)
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
export const billing_past_due_warning_sepa = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_past_due_warning_sepa(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_past_due_warning_sepa", locale)
	if (locale === "en") return en_billing_past_due_warning_sepa(inputs)
	return de_billing_past_due_warning_sepa(inputs)
};