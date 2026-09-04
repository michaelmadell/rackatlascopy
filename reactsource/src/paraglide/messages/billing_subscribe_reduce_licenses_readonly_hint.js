/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_subscribe_reduce_licenses_readonly_hint = /** @type {(inputs: { action: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Want to subscribe with fewer licenses? Open a rack you'd like to deactivate and choose "${i?.action}" from the ⋮ menu in the right sidebar.`)
};

const de_billing_subscribe_reduce_licenses_readonly_hint = /** @type {(inputs: { action: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Möchtest Du mit weniger Lizenzen abonnieren? Öffne einen Rack, den Du deaktivieren möchtest, und wähle "${i?.action}" im ⋮ Menü in der rechten Seitenleiste.`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ action: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const billing_subscribe_reduce_licenses_readonly_hint = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_subscribe_reduce_licenses_readonly_hint(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_subscribe_reduce_licenses_readonly_hint", locale)
	if (locale === "en") return en_billing_subscribe_reduce_licenses_readonly_hint(inputs)
	return de_billing_subscribe_reduce_licenses_readonly_hint(inputs)
};