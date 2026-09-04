/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_vat_not_verified = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Your VAT number must be verified before subscribing. Please check its status in company details.`)
};

const de_billing_vat_not_verified = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Deine USt-IdNr. muss verifiziert sein, bevor Du ein Abonnement abschließen kannst. Bitte überprüfe den Status in den Firmendaten.`)
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
export const billing_vat_not_verified = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_vat_not_verified(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_vat_not_verified", locale)
	if (locale === "en") return en_billing_vat_not_verified(inputs)
	return de_billing_vat_not_verified(inputs)
};