/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_custom_rack_device_save_rebuild_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Saving will permanently delete all connections to the following devices and rebuild them from the updated template. Port settings, VLAN assignments and SFP module assignments will be lost as well. This action cannot be undone. We recommend that you download a PDF report, listing all affected devices and their connections.`)
};

const de_custom_rack_device_save_rebuild_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Beim Speichern werden alle Verbindungen zu den folgenden Geräten dauerhaft gelöscht und die Geräte aus der aktualisierten Vorlage neu erstellt. Port-Einstellungen, VLAN-Zuweisungen und SFP-Modul-Zuweisungen gehen ebenfalls verloren. Diese Aktion kann nicht rückgängig gemacht werden. Wir empfehlen Dir, einen PDF-Bericht herunterzuladen, der alle betroffenen Geräte und deren Verbindungen auflistet.`)
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
export const custom_rack_device_save_rebuild_description = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.custom_rack_device_save_rebuild_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("custom_rack_device_save_rebuild_description", locale)
	if (locale === "en") return en_custom_rack_device_save_rebuild_description(inputs)
	return de_custom_rack_device_save_rebuild_description(inputs)
};