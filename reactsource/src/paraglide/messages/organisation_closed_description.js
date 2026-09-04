/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_organisation_closed_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Your organisation has been closed. If you wish to reactivate it, please contact support within 90 days of the deletion request.`)
};

const de_organisation_closed_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Deine Organisation wurde geschlossen. Wenn Du sie reaktivieren möchtest, kontaktiere bitte den Support innerhalb von 90 Tagen nach der Löschanfrage.`)
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
export const organisation_closed_description = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.organisation_closed_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("organisation_closed_description", locale)
	if (locale === "en") return en_organisation_closed_description(inputs)
	return de_organisation_closed_description(inputs)
};