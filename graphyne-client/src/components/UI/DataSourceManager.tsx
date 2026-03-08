import { useState, useEffect } from "react";
import {
  Database,
  Plus,
  Trash2,
  X,
  Globe,
  FileJson,
  FileSpreadsheet,
  RefreshCw,
  Play,
  Square,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import { api } from "../../services/api";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
import { setSources, upsertSource, removeSource } from "../../store/dataSlice";
import type {
  DataSourceData,
  DataSourceConnectionConfig,
  DataField,
  DataSourceType,
} from "../../types/datasource";
import { socketService } from "../../services/socket";

interface DataSourceManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const SOURCE_TYPE_OPTIONS: {
  value: DataSourceType;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "rest-api",
    label: "REST API",
    icon: <Globe size={18} className="text-blue-400" />,
  },
  {
    value: "json-file",
    label: "JSON File",
    icon: <FileJson size={18} className="text-yellow-400" />,
  },
  {
    value: "csv-file",
    label: "CSV File",
    icon: <FileSpreadsheet size={18} className="text-green-400" />,
  },
];

export const DataSourceManager = ({
  isOpen,
  onClose,
}: DataSourceManagerProps) => {
  const dispatch = useAppDispatch();
  const projectId = useAppSelector((s) => s.canvas.present.meta.projectId);
  const sources = useAppSelector((s) => s.data.sources);
  const errors = useAppSelector((s) => s.data.errors);

  const [editingSource, setEditingSource] = useState<DataSourceData | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    fields?: DataField[];
    error?: string;
  } | null>(null);

  // Form state for create/edit
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<DataSourceType>("rest-api");
  const [formUrl, setFormUrl] = useState("");
  const [formFilePath, setFormFilePath] = useState("");
  const [formRootPath, setFormRootPath] = useState("");
  const [formInterval, setFormInterval] = useState(5);
  const [formAutoStart, setFormAutoStart] = useState(true);

  // Load sources when opened
  useEffect(() => {
    if (isOpen && projectId) {
      api
        .getDataSources(projectId)
        .then((data) => {
          dispatch(setSources(data));
        })
        .catch(console.error);
    }
  }, [isOpen, projectId, dispatch]);

  // Populate form when editing
  useEffect(() => {
    if (editingSource) {
      setFormName(editingSource.name);
      setFormType(editingSource.type);
      setFormUrl(editingSource.config.url || "");
      setFormFilePath(editingSource.config.filePath || "");
      setFormRootPath(editingSource.config.rootPath || "");
      setFormInterval(editingSource.pollingInterval);
      setFormAutoStart(editingSource.autoStart);
      setTestResult(null);
    }
  }, [editingSource]);

  const resetForm = () => {
    setFormName("");
    setFormType("rest-api");
    setFormUrl("");
    setFormFilePath("");
    setFormRootPath("");
    setFormInterval(5);
    setFormAutoStart(true);
    setTestResult(null);
    setEditingSource(null);
    setIsCreating(false);
  };

  const buildConfig = (): DataSourceConnectionConfig => ({
    url: formType === "rest-api" ? formUrl : undefined,
    filePath: formType !== "rest-api" ? formFilePath : undefined,
    rootPath: formRootPath || undefined,
  });

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await api.testDataSource({
        type: formType,
        config: buildConfig(),
      });
      setTestResult({ success: true, fields: result.fields });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, error: message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!projectId || !formName.trim()) return;

    try {
      const result = await api.saveDataSource(projectId, {
        id: editingSource?.id,
        name: formName,
        type: formType,
        config: buildConfig(),
        pollingInterval: formInterval,
        autoStart: formAutoStart,
        fields: testResult?.fields || editingSource?.fields,
      });
      dispatch(upsertSource(result.source));
      resetForm();
    } catch (err) {
      alert("Failed to save data source: " + err);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Delete this data source? Any bindings using it will stop working.",
      )
    )
      return;
    try {
      await api.deleteDataSource(id);
      dispatch(removeSource(id));
    } catch (err) {
      alert("Failed to delete: " + err);
    }
  };

  const handleStartPolling = (sourceId: string) => {
    socketService.emit("data:start-polling", { sourceId });
  };

  const handleStopPolling = (sourceId: string) => {
    socketService.emit("data:stop-polling", { sourceId });
  };

  if (!isOpen) return null;

  const showEditor = isCreating || editingSource;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[750px] h-[550px] bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-950 shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {showEditor && (
              <button
                onClick={resetForm}
                className="p-1 hover:bg-neutral-800 rounded mr-1"
              >
                <ChevronLeft size={18} className="text-neutral-400" />
              </button>
            )}
            <Database className="text-orange-400" size={20} />
            {showEditor
              ? editingSource
                ? `Edit: ${editingSource.name}`
                : "New Data Source"
              : "Data Sources"}
          </h2>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {!projectId ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-500 gap-2">
              <AlertCircle size={32} className="opacity-30" />
              <p className="text-sm">
                Select a Project first to manage its data sources.
              </p>
            </div>
          ) : !showEditor ? (
            /* --- SOURCE LIST VIEW --- */
            <div className="space-y-3">
              <button
                onClick={() => {
                  resetForm();
                  setIsCreating(true);
                }}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-neutral-700 rounded-lg text-neutral-400 hover:border-orange-400 hover:text-orange-300 transition-colors"
              >
                <Plus size={16} /> Add Data Source
              </button>

              {sources.length === 0 && (
                <p className="text-center text-neutral-600 text-sm py-8">
                  No data sources configured for this project yet.
                </p>
              )}

              {sources.map((source) => (
                <div
                  key={source.id}
                  className="group flex items-center gap-4 p-4 bg-neutral-800 rounded-lg border border-transparent hover:border-neutral-600 transition-colors"
                >
                  <div className="shrink-0">
                    {errors[source.id] ? (
                      <AlertCircle size={20} className="text-red-500" />
                    ) : (
                      <CheckCircle2 size={20} className="text-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-200 truncate">
                      {source.name}
                    </div>
                    <div className="text-xs text-neutral-500 font-mono flex gap-2">
                      <span className="uppercase">{source.type}</span>
                      <span>·</span>
                      <span>
                        {source.config.url ||
                          source.config.filePath ||
                          "No URL"}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-600 mt-0.5">
                      Polling:{" "}
                      {source.pollingInterval > 0
                        ? `Every ${source.pollingInterval}s`
                        : "Manual"}
                      {source.fields.length > 0 &&
                        ` · ${source.fields.length} fields detected`}
                    </div>
                    {errors[source.id] && (
                      <div className="text-xs text-red-400 mt-1 truncate">
                        {errors[source.id]}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleStartPolling(source.id)}
                      className="p-2 hover:bg-neutral-700 rounded text-green-400"
                      title="Start Polling"
                    >
                      <Play size={14} />
                    </button>
                    <button
                      onClick={() => handleStopPolling(source.id)}
                      className="p-2 hover:bg-neutral-700 rounded text-yellow-400"
                      title="Stop Polling"
                    >
                      <Square size={14} />
                    </button>
                    <button
                      onClick={() => setEditingSource(source)}
                      className="p-2 hover:bg-neutral-700 rounded text-blue-400"
                      title="Edit"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(source.id)}
                      className="p-2 hover:bg-neutral-700 rounded text-red-400"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* --- CREATE / EDIT VIEW --- */
            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="text-xs text-neutral-400 uppercase font-bold block mb-1">
                  Source Name
                </label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Scoreboard API"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white placeholder-neutral-600 focus:border-orange-400 outline-none"
                />
              </div>

              {/* Type Selector */}
              <div>
                <label className="text-xs text-neutral-400 uppercase font-bold block mb-2">
                  Type
                </label>
                <div className="flex gap-2">
                  {SOURCE_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFormType(opt.value)}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                        formType === opt.value
                          ? "border-orange-400 bg-orange-400/10 text-white"
                          : "border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-500"
                      }`}
                    >
                      {opt.icon}
                      <span className="text-xs font-bold">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Connection Config */}
              {formType === "rest-api" ? (
                <div>
                  <label className="text-xs text-neutral-400 uppercase font-bold block mb-1">
                    URL
                  </label>
                  <input
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://api.example.com/scores"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white placeholder-neutral-600 focus:border-orange-400 outline-none font-mono text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs text-neutral-400 uppercase font-bold block mb-1">
                    File Path (on server)
                  </label>
                  <input
                    value={formFilePath}
                    onChange={(e) => setFormFilePath(e.target.value)}
                    placeholder="/data/uploads/scores.json"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white placeholder-neutral-600 focus:border-orange-400 outline-none font-mono text-sm"
                  />
                </div>
              )}

              {/* Root Path */}
              <div>
                <label className="text-xs text-neutral-400 uppercase font-bold block mb-1">
                  JSON Root Path{" "}
                  <span className="text-neutral-600 normal-case">
                    (optional, e.g. "data.match")
                  </span>
                </label>
                <input
                  value={formRootPath}
                  onChange={(e) => setFormRootPath(e.target.value)}
                  placeholder="data"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white placeholder-neutral-600 focus:border-orange-400 outline-none font-mono text-sm"
                />
              </div>

              {/* Polling Config */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-neutral-400 uppercase font-bold block mb-1">
                    Polling Interval (seconds)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formInterval}
                    onChange={(e) => setFormInterval(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-white focus:border-orange-400 outline-none"
                  />
                  <p className="text-[10px] text-neutral-600 mt-1">
                    0 = manual refresh only
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <input
                    type="checkbox"
                    checked={formAutoStart}
                    onChange={(e) => setFormAutoStart(e.target.checked)}
                    className="accent-orange-400 w-4 h-4"
                    id="autostart"
                  />
                  <label
                    htmlFor="autostart"
                    className="text-sm text-neutral-300 cursor-pointer"
                  >
                    Auto-start on playout
                  </label>
                </div>
              </div>

              {/* Test Connection */}
              <div className="border-t border-neutral-800 pt-4">
                <div className="flex gap-3">
                  <button
                    onClick={handleTest}
                    disabled={isTesting || (!formUrl && !formFilePath)}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 rounded text-sm font-bold text-white disabled:opacity-40 transition-colors"
                  >
                    <RefreshCw
                      size={14}
                      className={isTesting ? "animate-spin" : ""}
                    />
                    {isTesting ? "Testing..." : "Test Connection"}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!formName.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-400 rounded text-sm font-bold text-black disabled:opacity-40 transition-colors"
                  >
                    Save
                  </button>
                </div>

                {/* Test Results */}
                {testResult && (
                  <div
                    className={`mt-3 p-3 rounded border text-sm ${
                      testResult.success
                        ? "bg-green-950/30 border-green-800 text-green-300"
                        : "bg-red-950/30 border-red-800 text-red-300"
                    }`}
                  >
                    {testResult.success ? (
                      <>
                        <div className="font-bold mb-2 flex items-center gap-2">
                          <CheckCircle2 size={14} /> Connection successful —{" "}
                          {testResult.fields?.length} fields detected
                        </div>
                        <div className="max-h-32 overflow-y-auto space-y-1 font-mono text-xs">
                          {testResult.fields?.map((f) => (
                            <div
                              key={f.path}
                              className="flex justify-between gap-2"
                            >
                              <span className="text-green-400">{f.path}</span>
                              <span className="text-neutral-500">{f.type}</span>
                              <span className="text-neutral-400 truncate max-w-[150px]">
                                {f.sampleValue}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle size={14} /> {testResult.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
