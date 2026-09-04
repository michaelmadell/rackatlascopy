/* eslint-disable */
import { getLocale, trackMessageCall, experimentalMiddlewareLocaleSplitting, isServer } from '../runtime.js';
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

const en_custom_rack_device_impact_dialog_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`This template is used by the devices listed below. Updating the custom rack device will delete all related devices and their connections, then recreate the devices from the updated template. Connections, port settings, VLAN assignments and SFP module assignments will be lost. We recommend that you download a PDF report, listing all affected devices and their connections.`)
};

const de_custom_rack_device_impact_dialog_description = /** @type {(inputs: {}) => LocalizedString} */ () => {
	return /** @type {LocalizedString} */ (`Diese Rack-Gerätevorlage wird von den unten aufgeführten Geräten verwendet. Das Aktualisieren des benutzerdefinierten Rack-Geräts wird alle verwandten Geräte und deren Verbindungen löschen. Anschließend werden die Geräte aus der aktualisierten Vorlage neu erstellt. Verbindungen, Port-Einstellungen, VLAN-Zuweisungen und SFP-Modul-Zuweisungen gehen verloren. Wir empfehlen Dir, einen PDF-Bericht herunterzuladen, der alle betroffenen Geräte und deren Verbindungen auflistet.`)
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
export const custom_rack_device_impact_dialog_description = (inputs = {}, options = {}) => {
	if (experimentalMiddlewareLocaleSplitting && isServer === false) {
		return /** @type {any} */ (globalThis).__paraglide_ssr.custom_rack_device_impact_dialog_description(inputs) 
	}
	const locale = options.locale ?? getLocale()
	trackMessageCall("custom_rack_device_impact_dialog_description", locale)
	if (locale === "en") return en_custom_rack_device_impact_dialog_description(inputs)
	return de_custom_rack_device_impact_dialog_description(inputs)
};