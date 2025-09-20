import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when user is typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatches = !!shortcut.ctrl === (event.ctrlKey || event.metaKey);
      const metaMatches = !!shortcut.meta === event.metaKey;
      const shiftMatches = !!shortcut.shift === event.shiftKey;
      const altMatches = !!shortcut.alt === event.altKey;

      return keyMatches && ctrlMatches && shiftMatches && altMatches && (!shortcut.meta || metaMatches);
    });

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault();
      }
      matchingShortcut.action();
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);

  return {
    shortcuts: shortcuts.map(shortcut => ({
      ...shortcut,
      displayKey: formatShortcutDisplay(shortcut)
    }))
  };
}

function formatShortcutDisplay(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.meta) parts.push('Cmd');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');

  parts.push(shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key);

  return parts.join(' + ');
}

// Predefined shortcut categories
export const createEditorShortcuts = (actions: {
  save: () => void;
  undo: () => void;
  redo: () => void;
  delete: () => void;
  escape: () => void;
  copy: () => void;
  paste: () => void;
  selectAll: () => void;
  toggleMode: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}) => [
  {
    key: 's',
    ctrl: true,
    description: 'Save project',
    action: actions.save
  },
  {
    key: 'z',
    ctrl: true,
    description: 'Undo',
    action: actions.undo
  },
  {
    key: 'z',
    ctrl: true,
    shift: true,
    description: 'Redo',
    action: actions.redo
  },
  {
    key: 'y',
    ctrl: true,
    description: 'Redo (alternative)',
    action: actions.redo
  },
  {
    key: 'Delete',
    description: 'Delete selected hotspot',
    action: actions.delete
  },
  {
    key: 'Escape',
    description: 'Clear selection',
    action: actions.escape
  },
  {
    key: 'c',
    ctrl: true,
    description: 'Copy hotspot',
    action: actions.copy
  },
  {
    key: 'v',
    ctrl: true,
    description: 'Paste hotspot',
    action: actions.paste
  },
  {
    key: 'a',
    ctrl: true,
    description: 'Select all hotspots',
    action: actions.selectAll
  },
  {
    key: 'e',
    ctrl: true,
    description: 'Toggle edit/preview mode',
    action: actions.toggleMode
  },
  {
    key: '=',
    ctrl: true,
    description: 'Zoom in',
    action: actions.zoomIn
  },
  {
    key: '-',
    ctrl: true,
    description: 'Zoom out',
    action: actions.zoomOut
  },
  {
    key: '0',
    ctrl: true,
    description: 'Reset zoom',
    action: actions.resetZoom
  }
];

export const createSlideNavigationShortcuts = (actions: {
  nextSlide: () => void;
  prevSlide: () => void;
  firstSlide: () => void;
  lastSlide: () => void;
}) => [
  {
    key: 'ArrowRight',
    description: 'Next slide',
    action: actions.nextSlide
  },
  {
    key: 'ArrowLeft',
    description: 'Previous slide',
    action: actions.prevSlide
  },
  {
    key: 'Home',
    description: 'First slide',
    action: actions.firstSlide
  },
  {
    key: 'End',
    description: 'Last slide',
    action: actions.lastSlide
  }
];