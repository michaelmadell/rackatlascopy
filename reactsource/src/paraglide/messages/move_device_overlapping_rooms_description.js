/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_move_device_overlapping_rooms_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Several rooms overlap at this position. Which one should the device belong to?`)
};

const de_move_device_overlapping_rooms_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`An dieser Position überlappen sich mehrere Räume. Zu welchem Raum soll das Gerät gehören?`)
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
export const move_device_overlapping_rooms_description = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.move_device_overlapping_rooms_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("move_device_overlapping_rooms_description", locale)
	if (locale === "en") return en_move_device_overlapping_rooms_description(inputs)
	return de_move_device_overlapping_rooms_description(inputs)
};