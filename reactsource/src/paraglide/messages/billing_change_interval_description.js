/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_change_interval_description = /** @type {(inputs: { current: NonNullable<unknown>, new: NonNullable<unknown>, date: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Your billing interval will change from ${i?.current} to ${i?.new} at the beginning of your next billing cycle on ${i?.date}.`)
};

const de_billing_change_interval_description = /** @type {(inputs: { current: NonNullable<unknown>, new: NonNullable<unknown>, date: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Dein Abrechnungsintervall wird zu Beginn des nächsten Abrechnungszyklus am ${i?.date} von ${i?.current} auf ${i?.new} geändert.`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ current: NonNullable<unknown>, new: NonNullable<unknown>, date: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const billing_change_interval_description = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_change_interval_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_change_interval_description", locale)
	if (locale === "en") return en_billing_change_interval_description(inputs)
	return de_billing_change_interval_description(inputs)
};