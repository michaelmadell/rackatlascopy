/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_move_device_left_room_description = /** @type {(inputs: { device: NonNullable<unknown>, room: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`“${i?.device}” is no longer located inside the room “${i?.room}”. Which room should it belong to now?`)
};

const de_move_device_left_room_description = /** @type {(inputs: { device: NonNullable<unknown>, room: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`„${i?.device}“ befindet sich nicht mehr innerhalb des Raums „${i?.room}“. Zu welchem Raum soll das Gerät jetzt gehören?`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ device: NonNullable<unknown>, room: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const move_device_left_room_description = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.move_device_left_room_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("move_device_left_room_description", locale)
	if (locale === "en") return en_move_device_left_room_description(inputs)
	return de_move_device_left_room_description(inputs)
};