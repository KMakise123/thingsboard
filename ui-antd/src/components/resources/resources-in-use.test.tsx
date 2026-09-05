/**
 * ResourcesInUseModal tests: single-mode grouped reference list (with the
 * link slot), multiple-mode selection gating, and the confirm/cancel
 * callbacks. The component is wording-agnostic — tests pass literal
 * strings exactly like the pages do.
 */
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ResourcesInUseModal,
  type ResourceInUseItem,
} from './resources-in-use';

function item(id: string, title: string, names: string[]): ResourceInUseItem {
  return {
    id,
    title,
    references: names.map((name, index) => ({
      key: `${id}-${index}`,
      typeName: 'Widget type',
      name,
      href: index === 0 ? `/widgets/editor/${id}-${index}` : undefined,
    })),
  };
}

function renderSingle(resource: ResourceInUseItem, onConfirm = vi.fn()) {
  const onClose = vi.fn();
  render(
    <ResourcesInUseModal
      open
      resources={[resource]}
      title="Resource is in use"
      message={`"${resource.title}" is referenced by the entities below.`}
      deleteText="Delete anyway"
      cancelText="Cancel"
      titleColumnLabel="Title"
      referencesColumnLabel="References"
      onClose={onClose}
      onConfirm={onConfirm}
    />,
  );
  return { onClose, onConfirm };
}

describe('ResourcesInUseModal', () => {
  it('renders flat reference rows with the type name and link slot', () => {
    const resource: ResourceInUseItem = {
      id: 'res-1',
      title: 'helper.js',
      references: [
        { key: 'a', typeName: 'Widget type', name: 'Thermometer', href: '/widgets/editor/wt-1' },
        { key: 'b', typeName: 'Widget type', name: 'Gauge' },
        { key: 'c', typeName: 'Dashboard', name: 'Plant A' },
      ],
    };
    renderSingle(resource);

    const rows = screen.getAllByTestId('resource-reference');
    expect(rows).toHaveLength(3);
    // Linkable entries render anchors; the rest stay plain text.
    expect(
      within(rows[0]).getByRole('link', { name: 'Thermometer' }),
    ).toHaveAttribute('href', '/widgets/editor/wt-1');
    expect(within(rows[1]).getByText('Gauge').tagName).toBe('SPAN');
    expect(within(rows[2]).getByText('Dashboard')).toBeInTheDocument();
  });

  it('confirms single-mode force delete with the echoed resource', () => {
    const onConfirm = vi.fn();
    const resource = item('res-1', 'helper.js', ['Thermometer']);
    const { onConfirm: confirm } = renderSingle(resource, onConfirm);
    fireEvent.click(screen.getByRole('button', { name: 'Delete anyway' }));
    expect(confirm).toHaveBeenCalledWith([resource]);
  });

  it('cancels through onClose without confirming', () => {
    const { onClose, onConfirm } = renderSingle(
      item('res-1', 'helper.js', ['Thermometer']),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('gates the multiple-mode confirm until a row is selected', () => {
    const onConfirm = vi.fn();
    const resources = [
      item('res-1', 'a.js', ['One']),
      item('res-2', 'b.js', ['Two']),
    ];
    render(
      <ResourcesInUseModal
        open
        multiple
        resources={resources}
        title="Resources are in use"
        message="Selected resources are referenced."
        deleteText="Delete anyway"
        cancelText="Cancel"
        titleColumnLabel="Title"
        referencesColumnLabel="References"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    const confirm = screen.getByRole('button', { name: 'Delete anyway' });
    expect(confirm).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();

    // Select the second row only — confirm must echo just that resource.
    fireEvent.click(
      document.querySelectorAll(
        '.ant-table-tbody .ant-table-selection-column .ant-checkbox-input',
      )[1] as HTMLElement,
    );
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith([resources[1]]);
  });
});
