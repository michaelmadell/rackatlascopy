/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_mdx_toolbar_numberedlist1 = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Numbered list`)
};

const de_mdx_toolbar_numberedlist1 = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Nummerierte Liste`)
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
const mdx_toolbar_numberedlist1 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.mdx_toolbar_numberedlist1(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("mdx_toolbar_numberedlist1", locale)
	if (locale === "en") return en_mdx_toolbar_numberedlist1(inputs)
	return de_mdx_toolbar_numberedlist1(inputs)
};
export { mdx_toolbar_numberedlist1 as "mdx_toolbar_numberedList" }