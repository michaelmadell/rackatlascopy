import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/patchdocs-ui';
import { TbTrash } from 'react-icons/tb';
import { COUNTING_DIRECTIONS, getPortTypeDef, type FaceElement } from './port-types';
import { computePortNumber } from './layout-utils';

/** Bottom panel, cloned from the real editor's "Port Group Settings" +
 *  "Port name" split: group-wide settings (ID prefix, counting direction,
 *  connector type) on the left, the selected element's own
 *  name/label/icon on the right. */
export default function PortSettingsPanel({
  element,
  allElements,
  hasAnyElements,
  onUpdateGroup,
  onUpdateValue,
  onDelete,
  readOnly
}: {
  element: FaceElement | null;
  allElements: FaceElement[];
  hasAnyElements: boolean;
  onUpdateGroup: (groupId: string, patch: Partial<FaceElement>) => void;
  onUpdateValue: (id: string, value: string) => void;
  onDelete: (element: FaceElement) => void;
  readOnly?: boolean;
}) {
  if (!element) {
    return (
      <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-6 text-center text-xs text-[#71717a]">
        {hasAnyElements ? 'Select a port to edit its settings.' : 'Drag an element from the toolbar onto the grid to get started.'}
      </div>
    );
  }

  if (element.kind !== 'port') {
    // Real markup for a selected icon element: an "Icon Settings" card
    // (same title-row + destructive-delete-button shape as "Port Group
    // Settings" below), single "Icon" field, no second/right-hand panel.
    // Text's own settings card wasn't directly observed — inferred as the
    // same shape with a "Label" field, since that's the only other
    // free-text element kind and the real editor visibly reuses this
    // card style across every element kind.
    const isIcon = element.kind === 'icon';
    return (
      <div className="rounded-lg border border-[#27272a] bg-[#18181b] p-3">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[#f4f4f5]">{isIcon ? 'Icon Settings' : 'Text Settings'}</h4>
          {!readOnly && (
            <Button variant="destructive" size="sm" onClick={() => onDelete(element)}>
              <TbTrash className="size-3.5 mr-1" /> {isIcon ? 'Delete icon' : 'Delete text'}
            </Button>
          )}
        </div>
        <div className="max-w-xs">
          <Label>{isIcon ? 'Icon' : 'Label'}</Label>
          <Input
            value={element.value || ''}
            onChange={(e: any) => onUpdateValue(element.id, e.target.value)}
            placeholder={isIcon ? 'e.g. fan' : 'e.g. Power'}
            disabled={readOnly}
          />
        </div>
      </div>
    );
  }

  const def = getPortTypeDef(element.portType || '');
  const groupPorts = allElements.filter((p) => p.kind === 'port' && p.groupId === element.groupId);

  return (
    <div className="flex gap-3">
      <div className="flex-1 rounded-lg border border-[#27272a] bg-[#18181b] p-3">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-xs font-semibold text-[#f4f4f5]">Port Group Settings</h4>
          {!readOnly && (
            <Button variant="destructive" size="sm" onClick={() => onDelete(element)}>
              <TbTrash className="size-3.5 mr-1" /> Delete port group
            </Button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>ID prefix</Label>
            <Input
              value={element.idPrefix || ''}
              onChange={(e: any) => onUpdateGroup(element.groupId!, { idPrefix: e.target.value })}
              placeholder="e.g. ETH"
              disabled={readOnly}
            />
          </div>
          <div>
            <Label>Counting Direction</Label>
            <Select
              value={element.countingDirection}
              onValueChange={(v: any) => onUpdateGroup(element.groupId!, { countingDirection: v })}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue>{COUNTING_DIRECTIONS.find((d) => d.id === element.countingDirection)?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {COUNTING_DIRECTIONS.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Connector type</Label>
            <Select
              value={element.connectorType}
              onValueChange={(v: any) => onUpdateGroup(element.groupId!, { connectorType: v })}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue>{element.connectorType}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(def?.connectors || []).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-[#52525b]">{groupPorts.length} port{groupPorts.length === 1 ? '' : 's'} in this group</p>
      </div>

      <div className="w-56 shrink-0 rounded-lg border border-[#27272a] bg-[#18181b] p-3">
        <Label>Port name</Label>
        <Input
          value={element.value || ''}
          onChange={(e: any) => onUpdateValue(element.id, e.target.value)}
          placeholder={computePortNumber(element, allElements)}
          maxLength={10}
          disabled={readOnly}
        />
        <p className="mt-1.5 text-[10px] text-[#52525b]">
          Max. 10 characters (including the optional group prefix). Must be unique within the device.
        </p>
      </div>
    </div>
  );
}
