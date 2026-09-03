/**
 * NodeConfigFormSlot — FROZEN SEAM (M8 brief §3 wave C), wave-3 K2 body: the
 * generated rule-node form. The slot is now a pure TRANSPARENT passthrough —
 * props {descriptor, configuration, onChange, disabled?} map 1:1 onto
 * NodeConfigFormProps, so the add-node dialog renders the same form as the
 * details drawer (generator + uiHints + P0 family registry + per-field JSON
 * source fallback).
 */
import { NodeConfigForm } from '@/components/rule-node/NodeConfigForm';
import type { RuleNodeComponentDescriptor } from '@/types/tb/rule-chain';

export interface NodeConfigFormSlotProps {
  descriptor: RuleNodeComponentDescriptor;
  configuration: Record<string, unknown>;
  onChange: (configuration: Record<string, unknown>) => void;
  disabled?: boolean;
}

export function NodeConfigFormSlot({
  descriptor,
  configuration,
  onChange,
  disabled = false,
}: NodeConfigFormSlotProps) {
  return (
    <div data-testid="rc-node-config-slot">
      <NodeConfigForm
        descriptor={descriptor}
        configuration={configuration}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
