/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_mdx_createlink_titletooltip2 = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`The title attribute of the link, shown on hover`)
};

const de_mdx_createlink_titletooltip2 = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Das Title-Attribut des Links, das beim Hover angezeigt wird`)
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
const mdx_createlink_titletooltip2 = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.mdx_createlink_titletooltip2(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("mdx_createlink_titletooltip2", locale)
	if (locale === "en") return en_mdx_createlink_titletooltip2(inputs)
	return de_mdx_createlink_titletooltip2(inputs)
};
export { mdx_createlink_titletooltip2 as "mdx_createLink_titleTooltip" }