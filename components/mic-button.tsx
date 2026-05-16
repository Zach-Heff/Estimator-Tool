"use client";

// Microphone toggle button for voice-to-text dictation.
// Wires the useSpeechRecognition hook + lucide Mic icon into a small button
// that can be dropped next to a textarea's action button (Send, Start Chat, etc.)
//
// Hidden entirely when the browser doesn't support speech recognition (e.g.,
// Firefox) — no broken state is ever shown.

import { Mic, MicOff } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

interface MicButtonProps {
  // Called with each final transcript chunk. Caller decides how to
  // incorporate it into their input state (typically: append with a space).
  onTranscript: (text: string) => void;
  // Pass-through disabled state when the parent is busy (e.g., AI is streaming)
  disabled?: boolean;
  // Optional className to override sizing/positioning in specific contexts
  className?: string;
}

export function MicButton({
  onTranscript,
  disabled = false,
  className = "",
}: MicButtonProps) {
  const { isListening, isSupported, error, start, stop } = useSpeechRecognition({
    onFinalTranscript: onTranscript,
  });

  // Don't render anything in unsupported browsers (Firefox) — keeps the UI
  // honest. The user simply won't see a mic option there.
  if (!isSupported) return null;

  const baseClasses =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-50";
  const stateClasses = isListening
    ? "border-red-300 bg-red-50 text-red-600 animate-pulse"
    : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700";

  const title = error
    ? `Microphone error: ${error}. Check your browser permissions.`
    : isListening
      ? "Listening… click to stop"
      : "Click to dictate (browser-based speech, audio processed by your browser provider)";

  return (
    <button
      type="button"
      onClick={isListening ? stop : start}
      disabled={disabled}
      title={title}
      aria-label={isListening ? "Stop dictation" : "Start dictation"}
      aria-pressed={isListening}
      className={`${baseClasses} ${stateClasses} ${className}`}
    >
      {error ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  );
}
