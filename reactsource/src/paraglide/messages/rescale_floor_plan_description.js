/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_rescale_floor_plan_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Rescaling will update all room and device coordinates to maintain their relative positions on the floor plan. This cannot be undone.`)
};

const de_rescale_floor_plan_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Beim Neuskalieren werden alle Raum- und Geräte-Koordinaten aktualisiert, um ihre relativen Positionen auf dem Grundriss beizubehalten. Dies kann nicht rückgängig gemacht werden.`)
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
export const rescale_floor_plan_description = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.rescale_floor_plan_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("rescale_floor_plan_description", locale)
	if (locale === "en") return en_rescale_floor_plan_description(inputs)
	return de_rescale_floor_plan_description(inputs)
};