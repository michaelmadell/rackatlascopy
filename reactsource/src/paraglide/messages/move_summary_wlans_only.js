/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_move_summary_wlans_only = /** @type {(inputs: { count: NonNullable<unknown>, count === 1 ? 'WLAN is' : 'WLANs are': NonNullable<unknown>, count === 1 ? 'belongs' : 'belong': NonNullable<unknown>, count === 1 ? 'WLAN wird' : 'WLANs werden': NonNullable<unknown>, count === 1 ? 'gehört' : 'gehören': NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.count} ${i?.count === 1 ? 'WLAN is' : 'WLANs are'} referenced but ${i?.count === 1 ? 'belongs' : 'belong'} to the current tenant.`)
};

const de_move_summary_wlans_only = /** @type {(inputs: { count: NonNullable<unknown>, count === 1 ? 'WLAN is' : 'WLANs are': NonNullable<unknown>, count === 1 ? 'belongs' : 'belong': NonNullable<unknown>, count === 1 ? 'WLAN wird' : 'WLANs werden': NonNullable<unknown>, count === 1 ? 'gehört' : 'gehören': NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.count} ${i?.count === 1 ? 'WLAN wird' : 'WLANs werden'} verwendet, ${i?.count === 1 ? 'gehört' : 'gehören'} aber zum aktuellen Mandanten.`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ count: NonNullable<unknown>, count === 1 ? 'WLAN is' : 'WLANs are': NonNullable<unknown>, count === 1 ? 'belongs' : 'belong': NonNullable<unknown>, count === 1 ? 'WLAN wird' : 'WLANs werden': NonNullable<unknown>, count === 1 ? 'gehört' : 'gehören': NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const move_summary_wlans_only = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.move_summary_wlans_only(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("move_summary_wlans_only", locale)
	if (locale === "en") return en_move_summary_wlans_only(inputs)
	return de_move_summary_wlans_only(inputs)
};