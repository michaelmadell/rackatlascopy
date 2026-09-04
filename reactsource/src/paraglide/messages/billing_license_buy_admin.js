/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_license_buy_admin = /** @type {(inputs: { price: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`This connection will activate a new rack, which requires a rack license. You currently have no unused licenses. A new license (${i?.price}) will be added to your subscription.`)
};

const de_billing_license_buy_admin = /** @type {(inputs: { price: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Diese Verbindung aktiviert ein neues Rack, wofür eine Rack-Lizenz benötigt wird. Du hast keine ungenutzten Lizenzen. Eine neue Lizenz (${i?.price}) wird Deinem Abonnement hinzugefügt.`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ price: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const billing_license_buy_admin = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_license_buy_admin(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_license_buy_admin", locale)
	if (locale === "en") return en_billing_license_buy_admin(inputs)
	return de_billing_license_buy_admin(inputs)
};