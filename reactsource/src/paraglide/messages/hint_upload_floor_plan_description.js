/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_hint_upload_floor_plan_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`To get started, please upload a floor plan via the sidebar before adding any devices.`)
};

const de_hint_upload_floor_plan_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Lade bitte einen Grundriss über die Sidebar hoch, bevor Du Geräte hinzufügst.`)
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
export const hint_upload_floor_plan_description = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.hint_upload_floor_plan_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("hint_upload_floor_plan_description", locale)
	if (locale === "en") return en_hint_upload_floor_plan_description(inputs)
	return de_hint_upload_floor_plan_description(inputs)
};