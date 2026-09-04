/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_transfer_ownership_confirmation = /** @type {(inputs: { email: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Are you sure you want to make "${i?.email}" the owner of this organisation? You will lose the owner role.`)
};

const de_transfer_ownership_confirmation = /** @type {(inputs: { email: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Bist Du sicher, dass Du "${i?.email}" zum Eigentümer dieser Organisation machen möchtest? Du verlierst dadurch die Eigentümerrolle.`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ email: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const transfer_ownership_confirmation = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.transfer_ownership_confirmation(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("transfer_ownership_confirmation", locale)
	if (locale === "en") return en_transfer_ownership_confirmation(inputs)
	return de_transfer_ownership_confirmation(inputs)
};