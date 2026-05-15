// Web Speech API wrapper for voice-to-text dictation.
//
// Browser support:
//   - Chrome / Edge: works well via window.SpeechRecognition or
//     window.webkitSpeechRecognition. Audio is sent to Google servers for
//     transcription (privacy note worth surfacing in the UI).
//   - Safari: webkitSpeechRecognition exists but continuous=true is flaky.
//     Results often arrive in big chunks after the user pauses.
//   - Firefox: not supported. Hook returns isSupported=false so the UI
//     can hide the mic entirely instead of showing a broken button.
//
// Usage:
//   const { isListening, isSupported, start, stop, error } =
//     useSpeechRecognition({ onFinalTranscript: (t) => appendToInput(t) });
//
//   if (!isSupported) return null;  // hide mic in UI

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal type shapes for the Web Speech API. The DOM lib types ship
// behind a flag in some TS versions and are inconsistent across browsers,
// so we declare just enough surface to type our own usage.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface UseSpeechRecognitionOptions {
  onFinalTranscript: (text: string) => void;
  lang?: string;
}

interface UseSpeechRecognitionResult {
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  start: () => void;
  stop: () => void;
}

// Detect speech recognition support once, lazily on first render. Using
// useState's lazy initializer (vs. setting state inside useEffect) avoids
// the React 19 "set state in effect" lint and the extra re-render that
// pattern causes.
function detectSupport(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function useSpeechRecognition({
  onFinalTranscript,
  lang = "en-US",
}: UseSpeechRecognitionOptions): UseSpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(detectSupport);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Keep the callback in a ref so the effect that wires recognition
  // doesn't need to re-run when the parent re-renders with a new function.
  const onTranscriptRef = useRef(onFinalTranscript);
  useEffect(() => {
    onTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    if (!isSupported || typeof window === "undefined") return;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    // Safari known issue: continuous=true is flaky on long dictation; results
    // may arrive in big chunks after the user pauses. Live with it for now.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      // Only emit FINAL transcripts. Interim results would cause repeated
      // partial-text appends which is messy in a chat input.
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        }
      }
      if (finalText) onTranscriptRef.current(finalText.trim());
    };

    recognition.onerror = (e) => {
      setError(e.error || "Speech recognition error");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // Ignore — recognition may already be stopped
      }
      recognitionRef.current = null;
    };
  }, [isSupported, lang]);

  const start = useCallback(() => {
    const r = recognitionRef.current;
    if (!r || isListening) return;
    setError(null);
    try {
      r.start();
      setIsListening(true);
    } catch (e) {
      // start() throws if already started, or if a previous session is
      // still tearing down. Treat as a no-op.
      console.warn("Speech recognition start failed:", e);
    }
  }, [isListening]);

  const stop = useCallback(() => {
    const r = recognitionRef.current;
    if (!r || !isListening) return;
    try {
      r.stop();
    } catch {
      // Ignore
    }
    setIsListening(false);
  }, [isListening]);

  return { isListening, isSupported, error, start, stop };
}
