/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_trial_banner_less_than_one = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`You have less than 1 day left in your trial.`)
};

const de_billing_trial_banner_less_than_one = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Du hast weniger als 1 Tag in Deiner Testphase.`)
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
export const billing_trial_banner_less_than_one = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_trial_banner_less_than_one(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_trial_banner_less_than_one", locale)
	if (locale === "en") return en_billing_trial_banner_less_than_one(inputs)
	return de_billing_trial_banner_less_than_one(inputs)
};