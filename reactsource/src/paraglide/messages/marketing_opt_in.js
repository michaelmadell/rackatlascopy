/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_marketing_opt_in = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Yes, send me practical tips on getting more out of Patchdocs, plus occasional product news.`)
};

const de_marketing_opt_in = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Ja, sende mir praktische Tipps, wie ich Patchdocs optimal nutzen kann, sowie gelegentliche Produktneuigkeiten.`)
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
export const marketing_opt_in = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.marketing_opt_in(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("marketing_opt_in", locale)
	if (locale === "en") return en_marketing_opt_in(inputs)
	return de_marketing_opt_in(inputs)
};