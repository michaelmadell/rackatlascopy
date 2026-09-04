/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_patchbox_configurator_color_note = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Black, white and grey cassettes are shown in slightly different shades, so you can still tell them apart in both light and dark mode.`)
};

const de_patchbox_configurator_color_note = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Schwarze, weiße und graue Kassetten werden in leicht abweichenden Tönen dargestellt, damit sie im hellen und im dunklen Modus unterscheidbar bleiben.`)
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
export const patchbox_configurator_color_note = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.patchbox_configurator_color_note(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("patchbox_configurator_color_note", locale)
	if (locale === "en") return en_patchbox_configurator_color_note(inputs)
	return de_patchbox_configurator_color_note(inputs)
};