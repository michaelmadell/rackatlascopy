/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_licenses_reduce_unavailable = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`All unused licenses are already scheduled for reduction. To reduce further, disconnect or delete active racks first.`)
};

const de_billing_licenses_reduce_unavailable = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Alle ungenutzten Lizenzen sind bereits zur Reduzierung eingeplant. Um weiter zu reduzieren, trenne oder lösche zuerst aktive Racks.`)
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
export const billing_licenses_reduce_unavailable = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_licenses_reduce_unavailable(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_licenses_reduce_unavailable", locale)
	if (locale === "en") return en_billing_licenses_reduce_unavailable(inputs)
	return de_billing_licenses_reduce_unavailable(inputs)
};