import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, AlertCircle, RotateCcw, ChevronDown, Key, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadGraphic, setGraphicMeta } from '../../store/canvasSlice';
import { api } from '../../services/api';

interface AiDesignPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Suggested prompts to help users get started
const SUGGESTED_PROMPTS = [
  'Lower third: player name "JOHN DOE", position "MIDFIELDER"',
  'Score bug: HOME 2 - 1 AWAY, white text on dark background',
  'Breaking news banner, red background, white bold text',
  'Full-screen semi-transparent overlay, dark, centered title text',
  'Top-right score bug, compact, gold and black colour scheme',
];

const LS_KEY = 'gemini_api_key';

// NEW: Panel now has an 'api-key' state for the first-use key-entry screen
type PanelState = 'api-key' | 'idle' | 'loading' | 'success' | 'error';

export const AiDesignPanel = ({ isOpen, onClose }: AiDesignPanelProps) => {
  const dispatch = useAppDispatch();
  const currentGraphic = useAppSelector((state) => state.canvas.present);

  const [prompt, setPrompt] = useState('');
  const [panelState, setPanelState] = useState<PanelState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastGeneratedName, setLastGeneratedName] = useState('');
  const [elementCount, setElementCount] = useState(0);

  const canModify = currentGraphic.elements.length > 0;
  const [modifyCurrent, setModifyCurrent] = useState(false);

  // NEW: API key state
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const apiKeyRef   = useRef<HTMLInputElement>(null);

  // NEW: On panel open, check localStorage for the API key.
  // If missing → show the key-entry screen. Otherwise → go to idle.
  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem(LS_KEY) ?? '';
      if (!storedKey) {
        setApiKeyInput('');
        setPanelState('api-key');
        setTimeout(() => apiKeyRef.current?.focus(), 100);
      } else {
        if (panelState === 'api-key') setPanelState('idle');
        if (panelState === 'idle') {
          setTimeout(() => textareaRef.current?.focus(), 100);
        }
        // Initialize the modify toggle based on canvas state ONLY when first opening.
        setModifyCurrent(currentGraphic.elements.length > 0);
      }
    }
    // We intentionally keep dependencies minimal to avoid resetting manual selections.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // NEW: Save the API key and move to the normal idle state
  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) return;
    localStorage.setItem(LS_KEY, trimmed);
    setShowKeyInput(false);
    setPanelState('idle');
    setModifyCurrent(currentGraphic.elements.length > 0);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  // NEW: Clear the saved key and show the key-entry screen again
  const handleChangeApiKey = () => {
    const storedKey = localStorage.getItem(LS_KEY) ?? '';
    setApiKeyInput(storedKey);
    setShowKeyInput(false);
    setPanelState('api-key');
    setTimeout(() => apiKeyRef.current?.focus(), 100);
  };

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || panelState === 'loading') return;

    // NEW: Retrieve key from localStorage at call time
    const apiKey = localStorage.getItem(LS_KEY) ?? '';
    if (!apiKey) {
      handleChangeApiKey();
      return;
    }

    setPanelState('loading');
    setErrorMessage('');

    try {
      const requestDesign = modifyCurrent ? {
        config: currentGraphic.config,
        elements: currentGraphic.elements
      } : undefined;

      // MODIFIED: Pass apiKey as second argument
      const design = await api.generateGraphic(trimmed, apiKey, requestDesign);

      // Load the AI-generated design into the Redux editor state as a draft.
      // IF modifying, keep the old ID and name to allow saving it back correctly.
      dispatch(loadGraphic({
        id: modifyCurrent ? (currentGraphic.meta.id ?? '') : '',
        name: modifyCurrent ? (currentGraphic.meta.name ?? design.name) : design.name,
        elements: design.elements,
        config: {
          ...design.config,
        },
      }));
      if (!modifyCurrent) {
        dispatch(setGraphicMeta({ name: design.name }));
      }

      setLastGeneratedName(design.name);
      setElementCount(design.elements.length);
      setPanelState('success');

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      // Surface a user-friendly message — the full error goes to the console
      const isConnectionError = message.toLowerCase().includes('network') ||
                                message.toLowerCase().includes('connect');
      const isAuthError       = message.toLowerCase().includes('api key') ||
                                message.toLowerCase().includes('401') ||
                                message.toLowerCase().includes('unauthorized') ||
                                message.toLowerCase().includes('invalid key');
      setErrorMessage(
        isAuthError
          ? 'Invalid API key. Click "Change API key" below to update it.'
          : isConnectionError
          ? 'Could not reach the server. Make sure Graphyne is running.'
          : 'Generation failed. Try rephrasing your prompt or check the console for details.'
      );
      console.error('❌ AI generation error:', message);
      setPanelState('error');
    }
  };

  const handleReset = () => {
    setPanelState('idle');
    setPrompt('');
    setErrorMessage('');
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-140 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-orange-400 to-fuchsia-500 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">AI Graphic Designer</h2>
              <p className="text-xs text-neutral-500">Describe a graphic — it loads as a draft in the editor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors p-1 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-6 flex flex-col gap-5">

          {/* ── NEW: API Key Entry State ── */}
          {panelState === 'api-key' && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col items-center gap-3 pt-2">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-orange-400/20 to-fuchsia-500/20
                                border border-orange-400/30 flex items-center justify-center">
                  <Key size={22} className="text-orange-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white">Enter your Gemini API Key</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Your key is stored locally in your browser and never sent to any third party.
                  </p>
                </div>
              </div>

              {/* Key input */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  API Key
                </label>
                <div className="relative">
                  <input
                    ref={apiKeyRef}
                    type={showKeyInput ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveApiKey(); }}
                    placeholder="AIzaSy…"
                    className="w-full bg-neutral-800 border border-neutral-700 focus:border-orange-400
                               text-sm text-white placeholder:text-neutral-600 rounded-xl
                               px-4 py-3 pr-10 outline-none transition-colors font-mono"
                  />
                  <button
                    onClick={() => setShowKeyInput(!showKeyInput)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                  >
                    {showKeyInput ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors w-fit"
                >
                  <ExternalLink size={11} />
                  Get a free key from Google AI Studio
                </a>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold
                             text-neutral-400 border border-neutral-700
                             hover:border-neutral-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveApiKey}
                  disabled={!apiKeyInput.trim()}
                  className="flex-1 flex items-center justify-center gap-2
                             px-4 py-2.5 rounded-xl text-sm font-bold
                             bg-linear-to-r from-orange-400 to-fuchsia-500
                             hover:from-orange-300 hover:to-fuchsia-400
                             text-white shadow-lg shadow-orange-500/20
                             disabled:opacity-40 disabled:cursor-not-allowed
                             transition-all"
                >
                  <Key size={14} />
                  Save &amp; Continue
                </button>
              </div>
            </div>
          )}

          {/* ── Idle / Input State ── */}
          {(panelState === 'idle' || panelState === 'error') && (
            <>
              {/* Prompt textarea */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Describe your graphic
                </label>
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='e.g. "Lower third with player name SARAH JONES and title GOALKEEPER, white text on dark transparent bar"'
                    rows={4}
                    maxLength={500}
                    className="w-full bg-neutral-800 border border-neutral-700 focus:border-orange-400
                               text-sm text-white placeholder:text-neutral-600 rounded-xl
                               px-4 py-3 resize-none outline-none transition-colors"
                  />
                  <span className="absolute bottom-3 right-3 text-xs text-neutral-600">
                    {prompt.length}/500
                  </span>
                </div>

                {/* Error message */}
                {panelState === 'error' && (
                  <div className="flex items-start gap-2 px-3 py-2 bg-red-950/50 border border-red-800 rounded-lg">
                    <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-300">{errorMessage}</p>
                  </div>
                )}

                {/* Modify switch */}
                {canModify && (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id="modify-current"
                      checked={modifyCurrent}
                      onChange={(e) => setModifyCurrent(e.target.checked)}
                      className="accent-orange-500 rounded border-neutral-700 bg-neutral-800 w-4 h-4"
                    />
                    <label htmlFor="modify-current" className="text-xs font-semibold text-neutral-300 select-none cursor-pointer">
                      Modify existing graphic setup
                    </label>
                  </div>
                )}
              </div>

              {/* Suggested prompts */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <ChevronDown size={12} className="text-neutral-600" />
                  <span className="text-xs text-neutral-600 uppercase tracking-wider font-semibold">
                    Suggestions
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTED_PROMPTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggestionClick(s)}
                      className="text-left text-xs text-neutral-400 hover:text-white
                                 px-3 py-2 rounded-lg hover:bg-neutral-800
                                 border border-transparent hover:border-neutral-700
                                 transition-all truncate"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold
                             text-neutral-400 border border-neutral-700
                             hover:border-neutral-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="flex-1 flex items-center justify-center gap-2
                             px-4 py-2.5 rounded-xl text-sm font-bold
                             bg-linear-to-r from-orange-400 to-fuchsia-500
                             hover:from-orange-300 hover:to-fuchsia-400
                             text-white shadow-lg shadow-orange-500/20
                             disabled:opacity-40 disabled:cursor-not-allowed
                             transition-all"
                >
                  <Send size={14} />
                  Generate
                  <span className="text-xs font-normal opacity-70 ml-1">⌘↵</span>
                </button>
              </div>

              {/* NEW: Change API key link */}
              <div className="flex justify-center">
                <button
                  onClick={handleChangeApiKey}
                  className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
                >
                  <Key size={11} />
                  Change API key
                </button>
              </div>
            </>
          )}

          {/* ── Loading State ── */}
          {panelState === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-4 py-10">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-2 border-neutral-700" />
                <div className="absolute inset-0 w-14 h-14 rounded-full border-2 border-t-orange-400
                                animate-spin border-r-fuchsia-500 border-b-transparent border-l-transparent" />
                <Sparkles size={20} className="absolute inset-0 m-auto text-orange-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Designing your graphic…</p>
                <p className="text-xs text-neutral-500 mt-1">
                  The AI is generating and validating your layout
                </p>
              </div>
              {/* Animated dots to show it's alive */}
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-orange-400"
                    style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Success State ── */}
          {panelState === 'success' && (
            <div className="flex flex-col gap-5">
              {/* Result summary */}
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-14 h-14 rounded-full bg-green-950/60 border border-green-700
                                flex items-center justify-center">
                  <Sparkles size={22} className="text-green-400" />
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-white">Draft loaded into editor</p>
                  <p className="text-sm text-neutral-400 mt-1">
                    <span className="text-orange-300 font-semibold">{lastGeneratedName}</span>
                    {' '}·{' '}
                    <span className="text-neutral-300">{elementCount} elements</span>
                  </p>
                </div>
              </div>

              {/* Instruction */}
              <div className="bg-neutral-800/60 border border-neutral-700 rounded-xl px-4 py-3">
                <p className="text-xs text-neutral-300 leading-relaxed">
                  The graphic is now on the canvas as a draft. Tweak it in the editor,
                  then hit <span className="font-bold text-orange-300">SAVE</span> to
                  compile and store it.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 flex-1 justify-center
                             px-4 py-2.5 rounded-xl text-sm font-semibold
                             text-neutral-400 border border-neutral-700
                             hover:border-neutral-500 hover:text-white transition-colors"
                >
                  <RotateCcw size={14} />
                  Generate Another
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold
                             bg-neutral-700 hover:bg-neutral-600
                             text-white transition-colors"
                >
                  Back to Editor
                </button>
              </div>

              {/* NEW: Change API key link */}
              <div className="flex justify-center">
                <button
                  onClick={handleChangeApiKey}
                  className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
                >
                  <Key size={11} />
                  Change API key
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
