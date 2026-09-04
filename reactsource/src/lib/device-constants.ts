import {
  TbBadge3D,
  TbServer,
  TbOutlet,
  TbPrinter,
  TbDeviceLaptop,
  TbDeviceDesktop,
  TbDeviceMobile,
  TbLockAccess,
  TbDeviceCctv,
  TbAccessPoint,
  TbNetwork
} from 'react-icons/tb'
import * as m from '@/paraglide/messages'

export const STANDARD_DEVICE_TYPES = {
  floor: [
    { id: 'access-control', label: () => m.access_control(), defaultPrefix: 'ACP', icon: TbLockAccess },
    { id: 'access-point', label: () => m.access_point(), defaultPrefix: 'AP', icon: TbAccessPoint },
    { id: 'camera', label: () => m.camera(), defaultPrefix: 'CAM', icon: TbDeviceCctv },
    { id: 'desktop', label: () => m.desktop(), defaultPrefix: 'DP', icon: TbDeviceDesktop },
    { id: 'floorbox', label: () => m.floorbox(), defaultPrefix: 'TO', icon: TbOutlet },
    { id: 'isp-uplink', label: () => m.isp_uplink(), defaultPrefix: 'ISP', icon: TbNetwork },
    { id: 'laptop', label: () => m.laptop(), defaultPrefix: 'LP', icon: TbDeviceLaptop },
    { id: 'phone', label: () => m.phone(), defaultPrefix: 'PH', icon: TbDeviceMobile },
    { id: 'printer', label: () => m.printer(), defaultPrefix: 'PR', icon: TbPrinter },
    { id: 'printer-3d', label: () => m.printer_3d(), defaultPrefix: '3DP', icon: TbBadge3D },
    { id: 'rack', label: () => m.rack(), defaultPrefix: 'RK', icon: TbServer },
    { id: 'screen', label: () => m.screen(), defaultPrefix: 'SCR', icon: TbDeviceDesktop }
  ],
  rack: [
    { id: 'cable-manager', label: () => m.cable_manager(), defaultPrefix: 'CM' },
    { id: 'firewall', label: () => m.firewall(), defaultPrefix: 'FW' },
    { id: 'rack-misc', label: () => m.miscellaneous(), defaultPrefix: 'MISC' },
    { id: 'patchbox', label: () => m.patchbox(), defaultPrefix: 'PBX' },
    { id: 'patch-panel', label: () => m.patch_panel(), defaultPrefix: 'PP' },
    { id: 'rack-router', label: () => m.router(), defaultPrefix: 'RT' },
    { id: 'rack-tray', label: () => m.rack_tray(), defaultPrefix: 'TR' },
    { id: 'rack-tray-device', label: () => m.rack_tray_device(), defaultPrefix: 'TRD' },
    { id: 'server', label: () => m.server(), defaultPrefix: 'SRV' },
    { id: 'sfp-device', label: () => m.sfp_device(), defaultPrefix: 'SFP' },
    { id: 'switch', label: () => m.switch_device(), defaultPrefix: 'SW' },
    { id: 'ups', label: () => m.ups(), defaultPrefix: 'UPS' }
  ]
}
