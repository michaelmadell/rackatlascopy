/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_delete_organisation_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This will permanently delete your entire organisation, including all users, tenants, locations, and data. The organisation will be closed immediately and all data permanently deleted after 90 days. You can contact support within this period to reactivate.`)
};

const de_delete_organisation_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Dies löscht Deine gesamte Organisation dauerhaft, einschließlich aller Benutzer, Mandanten, Standorte und Daten. Die Organisation wird sofort geschlossen und alle Daten nach 90 Tagen endgültig gelöscht. Du kannst innerhalb dieses Zeitraums den Support für eine Reaktivierung kontaktieren.`)
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
export const delete_organisation_description = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.delete_organisation_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("delete_organisation_description", locale)
	if (locale === "en") return en_delete_organisation_description(inputs)
	return de_delete_organisation_description(inputs)
};