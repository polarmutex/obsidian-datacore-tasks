/**
 * Settings Panel Component for JavaScript Kanban View
 * Provides configuration interface for columns, queries, and display options
 */
export function SettingsPanel(props) {
    const { settings, onSettingsChange, onClose, dc } = props;
    
    const [localSettings, setLocalSettings] = dc.useState({ ...settings });
    const [isDirty, setIsDirty] = dc.useState(false);
    
    // Handle settings change
    const handleSettingChange = dc.useCallback((key, value) => {
        const newSettings = { ...localSettings, [key]: value };
        setLocalSettings(newSettings);
        setIsDirty(true);
    }, [localSettings]);
    
    // Handle column change
    const handleColumnChange = dc.useCallback((index, key, value) => {
        const newColumns = [...localSettings.columns];
        newColumns[index] = { ...newColumns[index], [key]: value };
        handleSettingChange('columns', newColumns);
    }, [localSettings.columns, handleSettingChange]);
    
    // Add new column
    const addColumn = dc.useCallback(() => {
        const newColumn = {
            id: `column_${Date.now()}`,
            name: 'New Column',
            tag: '#new',
            color: '#6c757d'
        };
        handleSettingChange('columns', [...localSettings.columns, newColumn]);
    }, [localSettings.columns, handleSettingChange]);
    
    // Remove column
    const removeColumn = dc.useCallback((index) => {
        const newColumns = localSettings.columns.filter((_, i) => i !== index);
        handleSettingChange('columns', newColumns);
    }, [localSettings.columns, handleSettingChange]);
    
    // Save settings
    const saveSettings = dc.useCallback(() => {
        onSettingsChange(localSettings);
        setIsDirty(false);
    }, [localSettings, onSettingsChange]);
    
    // Reset settings
    const resetSettings = dc.useCallback(() => {
        setLocalSettings({ ...settings });
        setIsDirty(false);
    }, [settings]);
    
    return dc.jsx('div', {
        className: 'settings-panel',
        children: [
            // Header
            dc.jsx('div', {
                className: 'settings-header',
                children: [
                    dc.jsx('h3', {
                        className: 'settings-title',
                        children: 'Kanban Settings'
                    }),
                    dc.jsx('button', {
                        className: 'settings-close',
                        onClick: onClose,
                        children: '×'
                    })
                ]
            }),
            
            // Settings content
            dc.jsx('div', {
                className: 'settings-content',
                children: [
                    // Query settings
                    dc.jsx('div', {
                        className: 'settings-section',
                        children: [
                            dc.jsx('h4', {
                                className: 'settings-section-title',
                                children: 'Data Query'
                            }),
                            dc.jsx('div', {
                                className: 'settings-field',
                                children: [
                                    dc.jsx('label', {
                                        className: 'settings-label',
                                        children: 'Datacore Query:'
                                    }),
                                    dc.jsx('input', {
                                        type: 'text',
                                        className: 'settings-input',
                                        value: localSettings.datacoreQuery,
                                        onChange: (e) => handleSettingChange('datacoreQuery', e.target.value),
                                        placeholder: '@task'
                                    })
                                ]
                            }),
                            dc.jsx('div', {
                                className: 'settings-help',
                                children: 'Use Datacore query syntax to filter tasks. Example: @task WHERE !completed'
                            })
                        ]
                    }),
                    
                    // Column settings
                    dc.jsx('div', {
                        className: 'settings-section',
                        children: [
                            dc.jsx('div', {
                                className: 'settings-section-header',
                                children: [
                                    dc.jsx('h4', {
                                        className: 'settings-section-title',
                                        children: 'Columns'
                                    }),
                                    dc.jsx('button', {
                                        className: 'settings-add-button',
                                        onClick: addColumn,
                                        children: '+ Add Column'
                                    })
                                ]
                            }),
                            dc.jsx('div', {
                                className: 'settings-columns',
                                children: localSettings.columns.map((column, index) =>
                                    dc.jsx('div', {
                                        key: column.id,
                                        className: 'settings-column',
                                        children: [
                                            dc.jsx('div', {
                                                className: 'settings-column-header',
                                                children: [
                                                    dc.jsx('span', {
                                                        className: 'settings-column-number',
                                                        children: `Column ${index + 1}`
                                                    }),
                                                    dc.jsx('button', {
                                                        className: 'settings-remove-button',
                                                        onClick: () => removeColumn(index),
                                                        children: '×'
                                                    })
                                                ]
                                            }),
                                            dc.jsx('div', {
                                                className: 'settings-column-fields',
                                                children: [
                                                    dc.jsx('div', {
                                                        className: 'settings-field',
                                                        children: [
                                                            dc.jsx('label', {
                                                                className: 'settings-label',
                                                                children: 'Name:'
                                                            }),
                                                            dc.jsx('input', {
                                                                type: 'text',
                                                                className: 'settings-input',
                                                                value: column.name,
                                                                onChange: (e) => handleColumnChange(index, 'name', e.target.value)
                                                            })
                                                        ]
                                                    }),
                                                    dc.jsx('div', {
                                                        className: 'settings-field',
                                                        children: [
                                                            dc.jsx('label', {
                                                                className: 'settings-label',
                                                                children: 'Tag:'
                                                            }),
                                                            dc.jsx('input', {
                                                                type: 'text',
                                                                className: 'settings-input',
                                                                value: column.tag,
                                                                onChange: (e) => handleColumnChange(index, 'tag', e.target.value),
                                                                placeholder: '#todo'
                                                            })
                                                        ]
                                                    }),
                                                    dc.jsx('div', {
                                                        className: 'settings-field',
                                                        children: [
                                                            dc.jsx('label', {
                                                                className: 'settings-label',
                                                                children: 'Color:'
                                                            }),
                                                            dc.jsx('input', {
                                                                type: 'color',
                                                                className: 'settings-color-input',
                                                                value: column.color,
                                                                onChange: (e) => handleColumnChange(index, 'color', e.target.value)
                                                            })
                                                        ]
                                                    })
                                                ]
                                            })
                                        ]
                                    })
                                )
                            })
                        ]
                    }),
                    
                    // Display settings
                    dc.jsx('div', {
                        className: 'settings-section',
                        children: [
                            dc.jsx('h4', {
                                className: 'settings-section-title',
                                children: 'Display Options'
                            }),
                            dc.jsx('div', {
                                className: 'settings-field',
                                children: [
                                    dc.jsx('label', {
                                        className: 'settings-label',
                                        children: 'Card Max Height (px):'
                                    }),
                                    dc.jsx('input', {
                                        type: 'number',
                                        className: 'settings-input',
                                        value: localSettings.cardMaxHeight,
                                        onChange: (e) => handleSettingChange('cardMaxHeight', parseInt(e.target.value)),
                                        min: 50,
                                        max: 500
                                    })
                                ]
                            }),
                            dc.jsx('div', {
                                className: 'settings-checkbox-group',
                                children: [
                                    dc.jsx('label', {
                                        className: 'settings-checkbox-label',
                                        children: [
                                            dc.jsx('input', {
                                                type: 'checkbox',
                                                className: 'settings-checkbox',
                                                checked: localSettings.showDueDate,
                                                onChange: (e) => handleSettingChange('showDueDate', e.target.checked)
                                            }),
                                            dc.jsx('span', {
                                                children: 'Show Due Dates'
                                            })
                                        ]
                                    }),
                                    dc.jsx('label', {
                                        className: 'settings-checkbox-label',
                                        children: [
                                            dc.jsx('input', {
                                                type: 'checkbox',
                                                className: 'settings-checkbox',
                                                checked: localSettings.showPriority,
                                                onChange: (e) => handleSettingChange('showPriority', e.target.checked)
                                            }),
                                            dc.jsx('span', {
                                                children: 'Show Priority'
                                            })
                                        ]
                                    }),
                                    dc.jsx('label', {
                                        className: 'settings-checkbox-label',
                                        children: [
                                            dc.jsx('input', {
                                                type: 'checkbox',
                                                className: 'settings-checkbox',
                                                checked: localSettings.showTags,
                                                onChange: (e) => handleSettingChange('showTags', e.target.checked)
                                            }),
                                            dc.jsx('span', {
                                                children: 'Show Tags'
                                            })
                                        ]
                                    })
                                ]
                            })
                        ]
                    })
                ]
            }),
            
            // Footer
            dc.jsx('div', {
                className: 'settings-footer',
                children: [
                    dc.jsx('button', {
                        className: `settings-save ${isDirty ? 'dirty' : ''}`,
                        onClick: saveSettings,
                        disabled: !isDirty,
                        children: 'Save Changes'
                    }),
                    dc.jsx('button', {
                        className: 'settings-reset',
                        onClick: resetSettings,
                        disabled: !isDirty,
                        children: 'Reset'
                    })
                ]
            })
        ]
    });
}

SettingsPanel.displayName = 'SettingsPanel';