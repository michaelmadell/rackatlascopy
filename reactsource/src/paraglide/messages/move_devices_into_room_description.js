/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_move_devices_into_room_description = /** @type {(inputs: { count: NonNullable<unknown>, count === 1 ? 'device is' : 'devices are': NonNullable<unknown>, room: NonNullable<unknown>, count === 1 ? 'belongs' : 'belong': NonNullable<unknown>, count === 1 ? 'it' : 'them': NonNullable<unknown>, count === 1 ? 'Gerät befindet' : 'Geräte befinden': NonNullable<unknown>, count === 1 ? 'gehört' : 'gehören': NonNullable<unknown>, count === 1 ? 'es' : 'sie': NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.count} ${i?.count === 1 ? 'device is' : 'devices are'} located inside the room “${i?.room}” but ${i?.count === 1 ? 'belongs' : 'belong'} to another room. Do you want to move ${i?.count === 1 ? 'it' : 'them'} into this room?`)
};

const de_move_devices_into_room_description = /** @type {(inputs: { count: NonNullable<unknown>, count === 1 ? 'device is' : 'devices are': NonNullable<unknown>, room: NonNullable<unknown>, count === 1 ? 'belongs' : 'belong': NonNullable<unknown>, count === 1 ? 'it' : 'them': NonNullable<unknown>, count === 1 ? 'Gerät befindet' : 'Geräte befinden': NonNullable<unknown>, count === 1 ? 'gehört' : 'gehören': NonNullable<unknown>, count === 1 ? 'es' : 'sie': NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.count} ${i?.count === 1 ? 'Gerät befindet' : 'Geräte befinden'} sich innerhalb des Raums „${i?.room}“, ${i?.count === 1 ? 'gehört' : 'gehören'} aber zu einem anderen Raum. Möchtest Du ${i?.count === 1 ? 'es' : 'sie'} in diesen Raum verschieben?`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ count: NonNullable<unknown>, count === 1 ? 'device is' : 'devices are': NonNullable<unknown>, room: NonNullable<unknown>, count === 1 ? 'belongs' : 'belong': NonNullable<unknown>, count === 1 ? 'it' : 'them': NonNullable<unknown>, count === 1 ? 'Gerät befindet' : 'Geräte befinden': NonNullable<unknown>, count === 1 ? 'gehört' : 'gehören': NonNullable<unknown>, count === 1 ? 'es' : 'sie': NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const move_devices_into_room_description = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.move_devices_into_room_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("move_devices_into_room_description", locale)
	if (locale === "en") return en_move_devices_into_room_description(inputs)
	return de_move_devices_into_room_description(inputs)
};