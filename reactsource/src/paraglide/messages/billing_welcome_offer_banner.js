/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_welcome_offer_banner = /** @type {(inputs: { percent: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Save ${i?.percent}% with your welcome offer.`)
};

const de_billing_welcome_offer_banner = /** @type {(inputs: { percent: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Spare ${i?.percent}% mit Deinem Willkommensangebot.`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ percent: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const billing_welcome_offer_banner = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_welcome_offer_banner(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_welcome_offer_banner", locale)
	if (locale === "en") return en_billing_welcome_offer_banner(inputs)
	return de_billing_welcome_offer_banner(inputs)
};