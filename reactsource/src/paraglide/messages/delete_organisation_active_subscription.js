/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_delete_organisation_active_subscription = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Your organisation cannot be deleted while a subscription is active. Please contact support.`)
};

const de_delete_organisation_active_subscription = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Deine Organisation kann bei aktivem Abonnement nicht gelöscht werden. Bitte kontaktiere den Support.`)
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
export const delete_organisation_active_subscription = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.delete_organisation_active_subscription(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("delete_organisation_active_subscription", locale)
	if (locale === "en") return en_delete_organisation_active_subscription(inputs)
	return de_delete_organisation_active_subscription(inputs)
};