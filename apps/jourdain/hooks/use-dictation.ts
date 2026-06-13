"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal Web Speech API typings — SpeechRecognition isn't in TS's dom lib yet.
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = {
  results: { length: number; [index: number]: RecognitionResult };
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ??
    w.webkitSpeechRecognition ??
    null) as (new () => SpeechRecognitionInstance) | null;
}

/**
 * Browser-native dictation (Chrome/Edge/Safari). `onTranscript` receives the
 * full running transcript (interim + final) for the current listening session.
 */
export function useDictation(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    // SpeechRecognition exists on insecure pages but .start() is rejected, so
    // require a secure context (HTTPS or localhost) for the button to be live.
    setIsSupported(
      getRecognitionConstructor() !== null && window.isSecureContext,
    );
    return () => recognitionRef.current?.abort();
  }, []);

  const abort = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const RecognitionCtor = getRecognitionConstructor();
    if (!RecognitionCtor) return;

    const recognition = new RecognitionCtor();
    recognition.lang = navigator.language || "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result) {
          text += result[0].transcript;
        }
      }
      onTranscriptRef.current(text);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  return { isListening, isSupported, toggle, abort };
}
