/**
 * FormProperty data model — mirrored EXACTLY from the upstream Angular UI
 * (`ui-ngx/src/app/shared/models/dynamic-form.models.ts`), per ADR 0004 §4:
 * settingsForm reuses upstream key names and the FormProperty[] format so
 * imports/exports stay zero-conversion against TB.
 *
 * Only the data model is mirrored — the Angular layout helpers
 * (toPropertyGroups / cleanupFormProperty / …) are renderer-specific and are
 * replaced by the React renderer in this folder. Angular-side dynamic
 * behavior (`condition` / `conditionFunction` / `disableOnProperty` JS
 * evaluation) is intentionally NOT reimplemented in M7; such properties
 * render unconditionally.
 */

/** Upstream `FormPropertyType` (ui-ngx dynamic-form.models.ts). */
export enum FormPropertyType {
  text = 'text',
  number = 'number',
  password = 'password',
  textarea = 'textarea',
  switch = 'switch',
  select = 'select',
  radios = 'radios',
  datetime = 'datetime',
  image = 'image',
  javascript = 'javascript',
  json = 'json',
  html = 'html',
  css = 'css',
  markdown = 'markdown',
  color = 'color',
  color_settings = 'color_settings',
  font = 'font',
  units = 'units',
  icon = 'icon',
  fieldset = 'fieldset',
  array = 'array',
  htmlSection = 'htmlSection',
}

export const formPropertyTypes = Object.keys(
  FormPropertyType,
) as FormPropertyType[];

export type PropertyConditionFunction = (
  property: FormProperty,
  model: unknown,
) => boolean;

export interface FormPropertyBase {
  id: string;
  name: string;
  hint?: string;
  group?: string;
  type: FormPropertyType;
  default: unknown;
  required?: boolean;
  subLabel?: string;
  divider?: boolean;
  fieldSuffix?: string;
  disableOnProperty?: string;
  condition?: string;
  conditionFunction?: PropertyConditionFunction;
  disabled?: boolean;
  visible?: boolean;
  rowClass?: string;
  fieldClass?: string;
}

export interface FormTextareaProperty extends FormPropertyBase {
  rows?: number;
}

export interface FormNumberProperty extends FormPropertyBase {
  min?: number;
  max?: number;
  step?: number;
}

export interface FormFieldSetProperty extends FormPropertyBase {
  properties?: FormProperty[];
}

export interface FormArrayProperty extends FormPropertyBase {
  arrayItemName?: string;
  arrayItemType?: FormPropertyType;
}

export interface FormSelectItem {
  value: unknown;
  label: string;
}

export interface FormSelectProperty extends FormPropertyBase {
  multiple?: boolean;
  allowEmptyOption?: boolean;
  items?: FormSelectItem[];
  minItems?: number;
  maxItems?: number;
}

export type FormPropertyDirection = 'row' | 'column';

export interface FormRadiosProperty extends FormPropertyBase {
  direction?: FormPropertyDirection;
  items?: FormSelectItem[];
}

export type FormPropertyDateTimeType = 'date' | 'time' | 'datetime';

export interface FormDateTimeProperty extends FormPropertyBase {
  allowClear?: boolean;
  dateTimeType?: FormPropertyDateTimeType;
}

export interface FormJavascriptProperty extends FormPropertyBase {
  helpId?: string;
}

export interface FormMarkdownProperty extends FormPropertyBase {
  helpId?: string;
}

export interface FormHtmlSection extends FormPropertyBase {
  htmlClassList?: string[];
  htmlContent?: string;
}

export interface FormUnitProperty extends FormPropertyBase {
  supportsUnitConversion?: boolean;
}

/**
 * Upstream flattens every property variant into one type via intersection —
 * mirrored as-is so descriptors written against any upstream shape typecheck.
 */
export type FormProperty = FormPropertyBase &
  FormTextareaProperty &
  FormNumberProperty &
  FormSelectProperty &
  FormRadiosProperty &
  FormDateTimeProperty &
  FormJavascriptProperty &
  FormMarkdownProperty &
  FormFieldSetProperty &
  FormArrayProperty &
  FormHtmlSection &
  FormUnitProperty;
