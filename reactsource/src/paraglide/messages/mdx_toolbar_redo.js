/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_mdx_toolbar_redo = /** @type {(inputs: { shortcut: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Redo ${i?.shortcut}`)
};

const de_mdx_toolbar_redo = /** @type {(inputs: { shortcut: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Wiederholen ${i?.shortcut}`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ shortcut: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const mdx_toolbar_redo = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.mdx_toolbar_redo(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("mdx_toolbar_redo", locale)
	if (locale === "en") return en_mdx_toolbar_redo(inputs)
	return de_mdx_toolbar_redo(inputs)
};