/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_custom_rack_device_rebuild_devices_skipped = /** @type {(inputs: { devices: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`The following devices could not be rebuilt because they no longer fit in the rack: ${i?.devices}`)
};

const de_custom_rack_device_rebuild_devices_skipped = /** @type {(inputs: { devices: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Die folgenden Geräte konnten nicht neu erstellt werden, da sie nicht mehr in das Rack passen: ${i?.devices}`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ devices: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const custom_rack_device_rebuild_devices_skipped = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.custom_rack_device_rebuild_devices_skipped(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("custom_rack_device_rebuild_devices_skipped", locale)
	if (locale === "en") return en_custom_rack_device_rebuild_devices_skipped(inputs)
	return de_custom_rack_device_rebuild_devices_skipped(inputs)
};