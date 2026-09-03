/**
 * EditorCanvasContext — the EDIT-STATE channel of the canvas (P7 memo
 * pattern, ADR 0004 §2): transient editor concerns (the displayGrid force
 * used by the move-widgets dialog) travel here, while the widget subtree is
 * memoized against them — widget content never subscribes to this context.
 */
import { createContext, useContext, useMemo } from 'react';

export interface EditorCanvasOverride {
  /**
   * true = render the grid background regardless of gridSettings.displayGrid
   * (move-widgets dialog open, ui-ngx dashboard-layout.component.ts:117).
   */
  displayGridAlways: boolean;
}

const DEFAULT_OVERRIDE: EditorCanvasOverride = { displayGridAlways: false };

export const EditorCanvasContext =
  createContext<EditorCanvasOverride>(DEFAULT_OVERRIDE);

export function useEditorCanvasOverride(): EditorCanvasOverride {
  return useContext(EditorCanvasContext);
}

export interface EditorCanvasOverrideProviderProps
  extends EditorCanvasOverride {
  children: React.ReactNode;
}

/** Convenience provider: `<EditorCanvasOverrideProvider displayGridAlways />` */
export function EditorCanvasOverrideProvider({
  displayGridAlways,
  children,
}: EditorCanvasOverrideProviderProps) {
  const value = useMemo(() => ({ displayGridAlways }), [displayGridAlways]);
  return (
    <EditorCanvasContext.Provider value={value}>
      {children}
    </EditorCanvasContext.Provider>
  );
}
