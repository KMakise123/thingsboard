import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EditorSession } from './session';
import { useEditorSession } from './use-editor-session';

interface Doc {
  text: string;
}

describe('useEditorSession', () => {
  it('mirrors session state and re-renders on write/undo', () => {
    const session = new EditorSession<Doc>();
    session.enter({ text: 'base' });
    const { result } = renderHook(() => useEditorSession(session));

    expect(result.current.current.text).toBe('base');
    expect(result.current.dirty).toBe(false);

    act(() => {
      session.write('w1', (draft) => {
        draft.text = 'one';
      });
    });
    expect(result.current.dirty).toBe(true);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.current.text).toBe('one');

    act(() => {
      session.undo();
    });
    expect(result.current.dirty).toBe(false);
    expect(result.current.canRedo).toBe(true);
    expect(result.current.current.text).toBe('base');
  });
});
