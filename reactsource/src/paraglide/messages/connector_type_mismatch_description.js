/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_connector_type_mismatch_description = /** @type {(inputs: { from: NonNullable<unknown>, to: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`The source port (${i?.from}) and target port (${i?.to}) have different connector types. Do you want to proceed?`)
};

const de_connector_type_mismatch_description = /** @type {(inputs: { from: NonNullable<unknown>, to: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Der Ausgangs-Port (${i?.from}) und der Ziel-Port (${i?.to}) haben unterschiedliche Anschlusstypen. Möchtest Du fortfahren?`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ from: NonNullable<unknown>, to: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const connector_type_mismatch_description = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.connector_type_mismatch_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("connector_type_mismatch_description", locale)
	if (locale === "en") return en_connector_type_mismatch_description(inputs)
	return de_connector_type_mismatch_description(inputs)
};