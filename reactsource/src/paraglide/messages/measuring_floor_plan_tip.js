/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_measuring_floor_plan_tip = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Set the real-world scale by measuring a distance and entering its actual length.`)
};

const de_measuring_floor_plan_tip = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Stelle den realen Maßstab ein, indem Du eine Entfernung misst und ihre tatsächliche Länge eingibst.`)
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
export const measuring_floor_plan_tip = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.measuring_floor_plan_tip(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("measuring_floor_plan_tip", locale)
	if (locale === "en") return en_measuring_floor_plan_tip(inputs)
	return de_measuring_floor_plan_tip(inputs)
};