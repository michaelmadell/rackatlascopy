import {
  TbServer,
  TbRouter,
  TbShieldLock,
  TbTopologyStar3,
  TbPlugConnected,
  TbBattery3,
  TbDatabase,
  TbSwitchHorizontal,
  TbWifi,
  TbAntenna
} from 'react-icons/tb';

/**
 * Best-effort device-type → icon/accent-color mapping, keyed by substring
 * match on the device's `type` string (case-insensitive) — there's no
 * fixed enum backing this field (it's freeform, set from whatever the
 * custom rack device catalog entry says), so this degrades gracefully to
 * a generic server icon/neutral accent for anything unrecognized.
 */
const RULES: Array<{ test: RegExp; icon: typeof TbServer; color: string }> = [
  { test: /firewall/i, icon: TbShieldLock, color: '#f87171' },
  { test: /router/i, icon: TbRouter, color: '#fb923c' },
  { test: /switch/i, icon: TbSwitchHorizontal, color: '#60a5fa' },
  { test: /patch/i, icon: TbTopologyStar3, color: '#a3a3a3' },
  { test: /(pdu|power)/i, icon: TbPlugConnected, color: '#facc15' },
  { test: /ups|battery/i, icon: TbBattery3, color: '#4ade80' },
  { test: /(storage|san|nas)/i, icon: TbDatabase, color: '#c084fc' },
  { test: /(wireless|access point|\bap\b)/i, icon: TbWifi, color: '#38bdf8' },
  { test: /antenna/i, icon: TbAntenna, color: '#38bdf8' }
];

export function getDeviceVisual(type?: string): { Icon: typeof TbServer; color: string } {
  const t = type || '';
  const rule = RULES.find((r) => r.test.test(t));
  return rule ? { Icon: rule.icon, color: rule.color } : { Icon: TbServer, color: '#71717a' };
}
