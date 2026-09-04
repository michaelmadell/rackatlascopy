/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_licenses_scheduled_reduction = /** @type {(inputs: { count: NonNullable<unknown>, date: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Reducing to ${i?.count} licenses on ${i?.date}`)
};

const de_billing_licenses_scheduled_reduction = /** @type {(inputs: { count: NonNullable<unknown>, date: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Reduzierung auf ${i?.count} Lizenzen am ${i?.date}`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ count: NonNullable<unknown>, date: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const billing_licenses_scheduled_reduction = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_licenses_scheduled_reduction(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_licenses_scheduled_reduction", locale)
	if (locale === "en") return en_billing_licenses_scheduled_reduction(inputs)
	return de_billing_licenses_scheduled_reduction(inputs)
};