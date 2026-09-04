/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_mdx_linkpreview_open1 = /** @type {(inputs: { url: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`Open ${i?.url} in a new window`)
};

const de_mdx_linkpreview_open1 = /** @type {(inputs: { url: NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.url} in einem neuen Fenster öffnen`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ url: NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
const mdx_linkpreview_open1 = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.mdx_linkpreview_open1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("mdx_linkpreview_open1", locale)
	if (locale === "en") return en_mdx_linkpreview_open1(inputs)
	return de_mdx_linkpreview_open1(inputs)
};
export { mdx_linkpreview_open1 as "mdx_linkPreview_open" }