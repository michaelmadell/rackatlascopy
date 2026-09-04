/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_delete_organisation_confirmation = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Are you sure you want to delete your entire organisation? This affects all users and data, not just your personal access. You have 90 days to contact support for reactivation.`)
};

const de_delete_organisation_confirmation = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Bist Du sicher, dass Du Deine gesamte Organisation löschen möchtest? Dies betrifft alle Benutzer und Daten, nicht nur Deinen persönlichen Zugang. Du hast 90 Tage Zeit, den Support für eine Reaktivierung zu kontaktieren.`)
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
export const delete_organisation_confirmation = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.delete_organisation_confirmation(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("delete_organisation_confirmation", locale)
	if (locale === "en") return en_delete_organisation_confirmation(inputs)
	return de_delete_organisation_confirmation(inputs)
};