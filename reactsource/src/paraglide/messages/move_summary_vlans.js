/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_move_summary_vlans = /** @type {(inputs: { vlans: NonNullable<unknown>, vlans === 1 ? 'VLAN' : 'VLANs': NonNullable<unknown>, wlans: NonNullable<unknown>, wlans === 1 ? 'WLAN' : 'WLANs': NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.vlans} ${i?.vlans === 1 ? 'VLAN' : 'VLANs'} and ${i?.wlans} ${i?.wlans === 1 ? 'WLAN' : 'WLANs'} are referenced but belong to the current tenant.`)
};

const de_move_summary_vlans = /** @type {(inputs: { vlans: NonNullable<unknown>, vlans === 1 ? 'VLAN' : 'VLANs': NonNullable<unknown>, wlans: NonNullable<unknown>, wlans === 1 ? 'WLAN' : 'WLANs': NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.vlans} ${i?.vlans === 1 ? 'VLAN' : 'VLANs'} und ${i?.wlans} ${i?.wlans === 1 ? 'WLAN' : 'WLANs'} werden verwendet, gehören aber zum aktuellen Mandanten.`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ vlans: NonNullable<unknown>, vlans === 1 ? 'VLAN' : 'VLANs': NonNullable<unknown>, wlans: NonNullable<unknown>, wlans === 1 ? 'WLAN' : 'WLANs': NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const move_summary_vlans = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.move_summary_vlans(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("move_summary_vlans", locale)
	if (locale === "en") return en_move_summary_vlans(inputs)
	return de_move_summary_vlans(inputs)
};