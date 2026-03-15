import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, AlertCircle, RotateCcw, ChevronDown } from 'lucide-react';
import { useAppDispatch } from '../../store/hooks';
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

  const [prompt, setPrompt] = useState('');
  const [panelState, setPanelState] = useState<PanelState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastGeneratedName, setLastGeneratedName] = useState('');
  const [elementCount, setElementCount] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen && panelState === 'idle') {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, panelState]);

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || panelState === 'loading') return;

    setPanelState('loading');
    setErrorMessage('');

    try {
      const design = await api.generateGraphic(trimmed);

      // Load the AI-generated design into the Redux editor state as a draft.
      // meta.id is set to '' — this tells the Save button to treat it as a
      // new graphic (not an update), so it won't overwrite anything until
      // the user explicitly saves.
      dispatch(loadGraphic({
        id: '',
        name: design.name,
        elements: design.elements,
        config: {
          ...design.config,
        },
      }));
      dispatch(setGraphicMeta({ name: design.name }));

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[560px] bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-fuchsia-500 flex items-center justify-center">
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
                             bg-gradient-to-r from-orange-400 to-fuchsia-500
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
            </div>
          )}

        </div>
      </div>
    </div>
  );
};