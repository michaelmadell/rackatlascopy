/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_move_summary_connections_deleted = /** @type {(inputs: { count: NonNullable<unknown>, count === 1 ? 'connection' : 'connections': NonNullable<unknown>, count === 1 ? 'Verbindung' : 'Verbindungen': NonNullable<unknown>, count === 1 ? 'wird' : 'werden': NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.count} ${i?.count === 1 ? 'connection' : 'connections'} leaving the moved resource will be deleted`)
};

const de_move_summary_connections_deleted = /** @type {(inputs: { count: NonNullable<unknown>, count === 1 ? 'connection' : 'connections': NonNullable<unknown>, count === 1 ? 'Verbindung' : 'Verbindungen': NonNullable<unknown>, count === 1 ? 'wird' : 'werden': NonNullable<unknown> }) => LocalizedString} */ (i) => {
	return /** @type {LocalizedString} */ (`${i?.count} ${i?.count === 1 ? 'Verbindung' : 'Verbindungen'} aus der verschobenen Ressource heraus ${i?.count === 1 ? 'wird' : 'werden'} gelöscht`)
};

/**
* This function has been compiled by [Paraglide JS](https://inlang.com/m/gerre34r).
*
* - Changing this function will be over-written by the next build.
*
* - If you want to change the translations, you can either edit the source files e.g. `en.json`, or
* use another inlang app like [Fink](https://inlang.com/m/tdozzpar) or the [VSCode extension Sherlock](https://inlang.com/m/r7kp499g).
* 
* @param {{ count: NonNullable<unknown>, count === 1 ? 'connection' : 'connections': NonNullable<unknown>, count === 1 ? 'Verbindung' : 'Verbindungen': NonNullable<unknown>, count === 1 ? 'wird' : 'werden': NonNullable<unknown> }} inputs
* @param {{ locale?: "en" | "de" }} options
* @returns {LocalizedString}
*/
/* @__NO_SIDE_EFFECTS__ */
export const move_summary_connections_deleted = (inputs, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.move_summary_connections_deleted(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("move_summary_connections_deleted", locale)
	if (locale === "en") return en_move_summary_connections_deleted(inputs)
	return de_move_summary_connections_deleted(inputs)
};