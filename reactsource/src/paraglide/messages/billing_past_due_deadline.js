/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_billing_past_due_deadline = /** @type {(inputs: { date: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Your account will be set to read-only on ${i?.date} if the issue isn't resolved.`)
};

const de_billing_past_due_deadline = /** @type {(inputs: { date: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Dein Konto wird am ${i?.date} in den Lese-Modus gesetzt, wenn das Problem bis dahin nicht behoben wird.`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ date: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const billing_past_due_deadline = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.billing_past_due_deadline(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("billing_past_due_deadline", locale)
	if (locale === "en") return en_billing_past_due_deadline(inputs)
	return de_billing_past_due_deadline(inputs)
};