import React, { useState } from 'react';
import { FocusTrap, AccessibleButton } from './A11y';

interface Shortcut {
  key: string;
  description: string;
  displayKey: string;
}

interface HelpPanelProps {
  shortcuts: Shortcut[];
  onClose: () => void;
}

export const HelpPanel: React.FC<HelpPanelProps> = ({ shortcuts, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShortcuts = shortcuts.filter(
    (shortcut) =>
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.displayKey.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const shortcutCategories = {
    'File Operations': filteredShortcuts.filter(
      (s) => s.description.includes('Save') || s.description.includes('Export')
    ),
    'Edit Operations': filteredShortcuts.filter(
      (s) =>
        s.description.includes('Undo') ||
        s.description.includes('Redo') ||
        s.description.includes('Copy') ||
        s.description.includes('Paste') ||
        s.description.includes('Delete') ||
        s.description.includes('Select')
    ),
    Navigation: filteredShortcuts.filter(
      (s) => s.description.includes('slide') || s.description.includes('Navigate')
    ),
    'View Controls': filteredShortcuts.filter(
      (s) =>
        s.description.includes('Zoom') ||
        s.description.includes('mode') ||
        s.description.includes('Toggle')
    ),
    Other: filteredShortcuts.filter(
      (s) =>
        !s.description.includes('Save') &&
        !s.description.includes('Export') &&
        !s.description.includes('Undo') &&
        !s.description.includes('Redo') &&
        !s.description.includes('Copy') &&
        !s.description.includes('Paste') &&
        !s.description.includes('Delete') &&
        !s.description.includes('Select') &&
        !s.description.includes('slide') &&
        !s.description.includes('Navigate') &&
        !s.description.includes('Zoom') &&
        !s.description.includes('mode') &&
        !s.description.includes('Toggle')
    ),
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <FocusTrap>
        <div className="modal-content help-panel" role="dialog" aria-labelledby="help-title">
          <div className="modal-header">
            <h2 id="help-title">Keyboard Shortcuts</h2>
            <AccessibleButton variant="ghost" onClick={onClose} aria-label="Close help panel">
              ×
            </AccessibleButton>
          </div>

          <div className="modal-body">
            <div className="help-search">
              <input
                type="text"
                placeholder="Search shortcuts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                aria-label="Search keyboard shortcuts"
              />
            </div>

            <div className="shortcuts-container">
              {Object.entries(shortcutCategories).map(([category, categoryShortcuts]) => {
                if (categoryShortcuts.length === 0) return null;

                return (
                  <div key={category} className="shortcut-category">
                    <h3 className="category-title">{category}</h3>
                    <div className="shortcuts-list">
                      {categoryShortcuts.map((shortcut, index) => (
                        <div key={`${shortcut.key}-${index}`} className="shortcut-item">
                          <div className="shortcut-keys">
                            {shortcut.displayKey.split(' + ').map((key, i) => (
                              <React.Fragment key={i}>
                                {i > 0 && <span className="key-separator">+</span>}
                                <kbd className="key">{key}</kbd>
                              </React.Fragment>
                            ))}
                          </div>
                          <div className="shortcut-description">{shortcut.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {filteredShortcuts.length === 0 && (
                <div className="no-shortcuts">
                  <p>No shortcuts found matching "{searchQuery}"</p>
                </div>
              )}
            </div>

            <div className="help-tips">
              <h3>Tips</h3>
              <ul>
                <li>
                  Press <kbd>?</kbd> at any time to open this help panel
                </li>
                <li>Most shortcuts work when you're not typing in a text field</li>
                <li>
                  Use <kbd>Escape</kbd> to close modals or clear selections
                </li>
                <li>Arrow keys can be used to navigate between slides</li>
              </ul>
            </div>
          </div>

          <div className="modal-footer">
            <AccessibleButton onClick={onClose}>Close</AccessibleButton>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
};

// Hook to manage help panel state
export function useHelpPanel(shortcuts: Shortcut[]) {
  const [isOpen, setIsOpen] = useState(false);

  const openHelp = () => setIsOpen(true);
  const closeHelp = () => setIsOpen(false);
  const toggleHelp = () => setIsOpen((prev) => !prev);

  // Register ? key to open help
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !isOpen) {
        e.preventDefault();
        openHelp();
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        closeHelp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const helpPanel = isOpen ? <HelpPanel shortcuts={shortcuts} onClose={closeHelp} /> : null;

  return {
    isOpen,
    openHelp,
    closeHelp,
    toggleHelp,
    helpPanel,
  };
}
