/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_no_building_connection_confirm = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This port has no building connection yet. The connection chain will be incomplete until a building connection is added. Continue anyway?`)
};

const de_no_building_connection_confirm = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Dieser Port hat noch keine Gebäudeverbindung. Die Verbindungskette wird unvollständig sein, bis eine Gebäudeverbindung hinzugefügt wird. Trotzdem fortfahren?`)
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
export const no_building_connection_confirm = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.no_building_connection_confirm(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("no_building_connection_confirm", locale)
	if (locale === "en") return en_no_building_connection_confirm(inputs)
	return de_no_building_connection_confirm(inputs)
};