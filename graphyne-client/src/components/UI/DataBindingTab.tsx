import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, Unlink, Database, AlertCircle } from 'lucide-react';
import type { RootState } from '../../store/store';
import { updateElement } from '../../store/canvasSlice';
import type { CanvasElement, DataBinding } from '../../types/canvas';
import { getBindableProperties } from '../../services/dataResolver';

export const DataBindingTab = () => {
  const dispatch = useDispatch();

  // Canvas state (through redux-undo .present)
  const selectedId = useSelector((s: RootState) => s.canvas.present.selectedIds[0]);
  const element = useSelector((s: RootState) =>
    s.canvas.present.elements.find((el: CanvasElement) => el.id === selectedId)
  );

  // Data state (not undoable — top-level)
  const sources = useSelector((s: RootState) => s.data.sources);
  const liveData = useSelector((s: RootState) => s.data.liveData);

  // Form state for adding a new binding
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [selectedField, setSelectedField] = useState<string>('');
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [formatTemplate, setFormatTemplate] = useState<string>('');

  if (!element) {
    return (
      <div className="p-4 text-gray-500 text-sm flex flex-col items-center justify-center h-full gap-2">
        <Database size={24} className="opacity-30" />
        Select an element to bind data
      </div>
    );
  }

  const bindings = element.dataBindings || [];
  const bindableProps = getBindableProperties(element.type);

  // Get fields for the currently selected source
  const activeSource = sources.find(s => s.id === selectedSourceId);
  const availableFields = activeSource?.fields || [];

  // Check if a property is already bound
  const isBound = (prop: string) => bindings.some(b => b.targetProperty === prop);

  const handleAddBinding = () => {
    if (!selectedSourceId || !selectedField || !selectedProperty) return;
    if (isBound(selectedProperty)) return; // Already bound

    const source = sources.find(s => s.id === selectedSourceId);
    if (!source) return;

    const newBinding: DataBinding = {
      sourceId: selectedSourceId,
      sourceName: source.name,
      fieldPath: selectedField,
      targetProperty: selectedProperty,
      format: formatTemplate || undefined,
    };

    const updatedBindings = [...bindings, newBinding];

    dispatch(updateElement({
      id: element.id,
      dataBindings: updatedBindings,
    }));

    // Reset form
    setSelectedField('');
    setSelectedProperty('');
    setFormatTemplate('');
  };

  const handleRemoveBinding = (index: number) => {
    const updatedBindings = bindings.filter((_, i) => i !== index);
    dispatch(updateElement({
      id: element.id,
      dataBindings: updatedBindings.length > 0 ? updatedBindings : undefined,
    }));
  };

  // Resolve live value for display
  const getLiveValue = (binding: DataBinding): string => {
    const sourceData = liveData[binding.sourceId];
    if (!sourceData) return '—';
    const raw = sourceData[binding.fieldPath];
    if (raw === undefined) return '—';
    if (binding.format) {
      return binding.format.replace(/\{\{value\}\}/g, String(raw));
    }
    return String(raw);
  };

  return (
    <div className="p-4 space-y-5 text-sm">

      {/* --- EXISTING BINDINGS --- */}
      <div>
        <h3 className="font-bold text-xs text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Link size={12} /> Active Bindings
        </h3>

        {bindings.length === 0 ? (
          <div className="text-gray-600 text-xs py-4 text-center border border-dashed border-gray-800 rounded-lg">
            No data bindings on this element yet.
          </div>
        ) : (
          <div className="space-y-2">
            {bindings.map((binding, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-gray-950 border border-gray-800 rounded-lg group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-300 font-bold text-xs uppercase">
                      {binding.targetProperty}
                    </span>
                    <span className="text-gray-600">←</span>
                    <span className="text-blue-400 font-mono text-xs truncate">
                      {binding.fieldPath}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-600 mt-1 flex items-center gap-1">
                    <Database size={10} />
                    {binding.sourceName}
                    {binding.format && (
                      <span className="text-gray-500 ml-2">fmt: {binding.format}</span>
                    )}
                  </div>
                  {/* Live value preview */}
                  <div className="text-[10px] mt-1 text-green-400 font-mono">
                    Live: {getLiveValue(binding)}
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveBinding(index)}
                  className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  title="Remove binding"
                >
                  <Unlink size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- ADD NEW BINDING --- */}
      <div className="border-t border-gray-800 pt-4">
        <h3 className="font-bold text-xs text-gray-500 uppercase tracking-wider mb-3">
          Add Binding
        </h3>

        {sources.length === 0 ? (
          <div className="flex items-center gap-2 text-gray-600 text-xs p-3 bg-gray-950 border border-gray-800 rounded-lg">
            <AlertCircle size={14} />
            No data sources configured. Open the Data Source Manager to add one.
          </div>
        ) : (
          <div className="space-y-3">

            {/* Property to bind */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1 uppercase">Element Property</label>
              <select
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
                className="w-full bg-gray-950 p-2 rounded text-xs border border-gray-800 focus:border-orange-300 focus:outline-none text-gray-300
                [&>option]:bg-gray-950 [&>option]:text-gray-300"
              >
                <option value="">Select property...</option>
                {bindableProps.map(p => (
                  <option key={p.key} value={p.key} disabled={isBound(p.key)}>
                    {p.label}{isBound(p.key) ? ' (bound)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Data Source */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1 uppercase">Data Source</label>
              <select
                value={selectedSourceId}
                onChange={(e) => {
                  setSelectedSourceId(e.target.value);
                  setSelectedField(''); // Reset field when source changes
                }}
                className="w-full bg-gray-950 p-2 rounded text-xs border border-gray-800 focus:border-orange-300 focus:outline-none text-gray-300
                [&>option]:bg-gray-950 [&>option]:text-gray-300"
              >
                <option value="">Select source...</option>
                {sources.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Field */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1 uppercase">Field</label>
              <select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                disabled={!selectedSourceId || availableFields.length === 0}
                className="w-full bg-gray-950 p-2 rounded text-xs border border-gray-800 focus:border-orange-300 focus:outline-none text-gray-300 disabled:opacity-40
                [&>option]:bg-gray-950 [&>option]:text-gray-300"
              >
                <option value="">
                  {!selectedSourceId
                    ? 'Select a source first...'
                    : availableFields.length === 0
                      ? 'No fields detected (test the source)'
                      : 'Select field...'}
                </option>
                {availableFields.map(f => (
                  <option key={f.path} value={f.path}>
                    {f.path} ({f.type}){f.sampleValue ? ` — "${f.sampleValue}"` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Format Template (Optional) */}
            <div>
              <label className="text-[10px] text-gray-400 block mb-1 uppercase">
                Format Template <span className="text-gray-600 normal-case">(optional)</span>
              </label>
              <input
                type="text"
                value={formatTemplate}
                onChange={(e) => setFormatTemplate(e.target.value)}
                placeholder='e.g. Score: {{value}}'
                className="w-full bg-gray-950 p-2 rounded text-xs border border-gray-800 focus:border-orange-300 focus:outline-none text-gray-300 font-mono placeholder-gray-700"
              />
              <p className="text-[10px] text-gray-700 mt-1">
                Use {'{{value}}'} where the data should appear.
              </p>
            </div>

            {/* Bind Button */}
            <button
              onClick={handleAddBinding}
              disabled={!selectedProperty || !selectedSourceId || !selectedField}
              className="w-full flex items-center justify-center gap-2 py-2 bg-orange-500 hover:bg-orange-400 text-black font-bold text-xs rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Link size={12} /> Bind
            </button>
          </div>
        )}
      </div>
    </div>
  );
};