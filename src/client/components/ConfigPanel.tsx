import React, { useState, useEffect } from 'react';
import { Hotspot, ConfigPanelProps, EventType, TriggerType } from '../../shared/types';
import { EVENT_TYPES, TRIGGER_TYPES } from '../../shared/constants';

export const ConfigPanel: React.FC<ConfigPanelProps & { width?: number }> = ({
  hotspot,
  onUpdate,
  onDelete,
  width = 320
}) => {
  const [formData, setFormData] = useState<Partial<Hotspot>>({});

  useEffect(() => {
    if (hotspot) {
      setFormData(hotspot);
    } else {
      setFormData({});
    }
  }, [hotspot]);

  const handleUpdate = (field: string, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);

    if (onUpdate && hotspot) {
      onUpdate({ ...hotspot, ...updatedData });
    }
  };

  const handleConfigUpdate = (configField: string, value: any) => {
    const updatedConfig = { ...formData.config, [configField]: value };
    const updatedData = { ...formData, config: updatedConfig };
    setFormData(updatedData);

    if (onUpdate && hotspot) {
      onUpdate({ ...hotspot, ...updatedData });
    }
  };

  if (!hotspot) {
    return (
      <div className="config-panel" style={{ width }}>
        <div className="config-panel-empty">
          <p>Select a hotspot to edit its properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className="config-panel" style={{ width }}>
      <div className="config-panel-header">
        <h3>Hotspot Properties</h3>
        <button
          className="btn btn-danger btn-sm"
          onClick={() => onDelete?.(hotspot.id)}
          title="Delete hotspot"
        >
          Delete
        </button>
      </div>

      <div className="config-panel-content">
        {/* Position and Size */}
        <div className="config-section">
          <h4>Position & Size</h4>
          <div className="form-row">
            <div className="form-group">
              <label>X Position</label>
              <input
                type="number"
                value={formData.x || 0}
                onChange={(e) => handleUpdate('x', parseInt(e.target.value))}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Y Position</label>
              <input
                type="number"
                value={formData.y || 0}
                onChange={(e) => handleUpdate('y', parseInt(e.target.value))}
                className="form-input"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Width</label>
              <input
                type="number"
                value={formData.width || 50}
                onChange={(e) => handleUpdate('width', parseInt(e.target.value))}
                className="form-input"
                min="10"
              />
            </div>
            <div className="form-group">
              <label>Height</label>
              <input
                type="number"
                value={formData.height || 50}
                onChange={(e) => handleUpdate('height', parseInt(e.target.value))}
                className="form-input"
                min="10"
              />
            </div>
          </div>
        </div>

        {/* Event Type */}
        <div className="config-section">
          <h4>Event Type</h4>
          <select
            value={formData.eventType || EventType.TEXT_POPUP}
            onChange={(e) => handleUpdate('eventType', e.target.value as EventType)}
            className="form-select"
          >
            {Object.entries(EVENT_TYPES).map(([key, config]) => (
              <option key={key} value={key}>
                {config.icon} {config.name}
              </option>
            ))}
          </select>
        </div>

        {/* Trigger Type */}
        <div className="config-section">
          <h4>Trigger Type</h4>
          <select
            value={formData.triggerType || TriggerType.CLICK}
            onChange={(e) => handleUpdate('triggerType', e.target.value as TriggerType)}
            className="form-select"
          >
            {Object.entries(TRIGGER_TYPES).map(([key, config]) => (
              <option key={key} value={key}>
                {config.icon} {config.name}
              </option>
            ))}
          </select>
        </div>

        {/* Content Configuration */}
        {formData.eventType === EventType.TEXT_POPUP && (
          <div className="config-section">
            <h4>Text Content</h4>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={formData.config?.title || ''}
                onChange={(e) => handleConfigUpdate('title', e.target.value)}
                className="form-input"
                placeholder="Optional title"
              />
            </div>
            <div className="form-group">
              <label>Text</label>
              <textarea
                value={formData.config?.text || ''}
                onChange={(e) => handleConfigUpdate('text', e.target.value)}
                className="form-textarea"
                placeholder="Enter hotspot text..."
                rows={4}
              />
            </div>
          </div>
        )}

        {/* Style Configuration */}
        <div className="config-section">
          <h4>Style</h4>
          <div className="form-group">
            <label>Background Color</label>
            <input
              type="color"
              value={formData.config?.backgroundColor || '#ffffff'}
              onChange={(e) => handleConfigUpdate('backgroundColor', e.target.value)}
              className="form-color-input"
            />
          </div>
          <div className="form-group">
            <label>Text Color</label>
            <input
              type="color"
              value={formData.config?.textColor || '#000000'}
              onChange={(e) => handleConfigUpdate('textColor', e.target.value)}
              className="form-color-input"
            />
          </div>
          <div className="form-group">
            <label>Font Size</label>
            <input
              type="number"
              value={formData.config?.fontSize || 14}
              onChange={(e) => handleConfigUpdate('fontSize', parseInt(e.target.value))}
              className="form-input"
              min="8"
              max="72"
            />
          </div>
        </div>

        {/* Visibility */}
        <div className="config-section">
          <h4>Visibility</h4>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isVisible !== false}
                onChange={(e) => handleUpdate('isVisible', e.target.checked)}
              />
              Visible
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};