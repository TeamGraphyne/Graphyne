import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, AlertCircle, RotateCcw, ChevronDown } from 'lucide-react';
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

type PanelState = 'idle' | 'loading' | 'success' | 'error';

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

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen) {
      if (panelState === 'idle') {
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
      
      // Initialize the toggle based on canvas state ONLY when the panel first opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setModifyCurrent(currentGraphic.elements.length > 0);
    }
    // We intentionally omit currentGraphic to avoid overwriting the user's manual selection.
    // We intentionally omit panelState so the checkbox doesn't reset when they click 'Generate'.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || panelState === 'loading') return;

    setPanelState('loading');
    setErrorMessage('');

    try {
      const requestDesign = modifyCurrent ? {
        config: currentGraphic.config,
        elements: currentGraphic.elements
      } : undefined;

      const design = await api.generateGraphic(trimmed, requestDesign);

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
      setErrorMessage(
        isConnectionError
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blur backdrop-blur-sm">
      <div className="w-[560px] bg-tab border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-blur">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-logoPurple to-logoOrange flex items-center justify-center">
              <Sparkles size={16} className="text-txt" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-txt">AI Graphic Designer</h2>
              <p className="text-[10px] text-txt">Describe a graphic — it loads as a draft in the editor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-txt hover:text-txtSelect transition-colors p-1 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-6 flex flex-col gap-5">

          {/* ── Idle / Input State ── */}
          {(panelState === 'idle' || panelState === 'error') && (
            <>
              {/* Prompt textarea */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-semibold text-txt uppercase tracking-wider">
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
                    className="w-full bg-tab border border-border hover:border-hover focus:border-select
                               text-[12px] text-txt placeholder:text-txtDisabled rounded-xl
                               px-4 py-3 resize-none outline-none transition-colors"
                  />
                  <span className="absolute bottom-3 right-3 text-[12px] text-txtDisabled">
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

                {/* Modfify switch */}
                {canModify && (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id="modify-current"
                      checked={modifyCurrent}
                      onChange={(e) => setModifyCurrent(e.target.checked)}
                      className="accent-select rounded border-border bg-tab w-4 h-4"
                    />
                    <label htmlFor="modify-current" className="text-xs font-semibold text-txt select-none cursor-pointer">
                      Modify existing graphic setup
                    </label>
                  </div>
                )}
              </div>

              {/* Suggested prompts */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <ChevronDown size={12} className="text-txt" />
                  <span className="text-xs text-txtDisabled uppercase tracking-wider font-semibold">
                    Suggestions
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTED_PROMPTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggestionClick(s)}
                      className="text-left text-xs text-txt hover:text-txtSelect
                                 px-3 py-2 rounded-lg hover:bg-lgPurpDis
                                 border border-transparent hover:border-lgOrngDis
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
                             text-border border border-border
                             hover:border-btn hover:text-txt transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="flex-1 flex items-center justify-center gap-2
                             px-4 py-2.5 rounded-xl text-sm font-bold
                             bg-linear-to-r from-lgOrngDis to-lgPurpDis
                             hover:from-logoOrange hover:to-logoPurple
                             text-txt shadow-lg 
                             disabled:opacity-40 disabled:cursor-not-allowed
                             transition-all"
                >
                  <Send size={14} />
                  Generate
                  <span className="text-xs font-normal opacity-70 ml-1">⌘↵</span>
                </button>
              </div>
            </>
          )}

          {/* ── Loading State ── */}
          {panelState === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-4 py-10">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-2 border-border" />
                <div className="absolute inset-0 w-14 h-14 rounded-full border-2 border-t-logoOrange
                                animate-spin border-r-logoPurple border-b-transparent border-l-transparent" />
                <Sparkles size={20} className="absolute inset-0 m-auto text-select" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-txt">Designing your graphic…</p>
                <p className="text-xs text-txtDisabled mt-1">
                  The AI is generating and validating your layout
                </p>
              </div>
              {/* Animated dots to show it's alive */}
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-select"
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
                  <p className="text-base font-bold text-txt">Draft loaded into editor</p>
                  <p className="text-sm text-txt mt-1">
                    <span className="text-txtSelect font-semibold">{lastGeneratedName}</span>
                    {' '}·{' '}
                    <span className="text-txt">{elementCount} elements</span>
                  </p>
                </div>
              </div>

              {/* Instruction */}
              <div className="bg-tab border border-border rounded-xl px-4 py-3">
                <p className="text-xs text-txt leading-relaxed">
                  The graphic is now on the canvas as a draft. Tweak it in the editor,
                  then hit <span className="font-bold text-select">SAVE</span> to
                  compile and store it.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 flex-1 justify-center
                             px-4 py-2.5 rounded-xl text-sm font-semibold
                             text-txt border border-border
                             hover:border-hover hover:text-txtSelect transition-colors"
                >
                  <RotateCcw size={14} />
                  Generate Another
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold
                             bg-tab hover:bg-hover
                             text-txt transition-colors"
                >
                  Back to Editor
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};