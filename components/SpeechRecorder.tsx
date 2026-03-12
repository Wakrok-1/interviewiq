"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

export interface StutterData {
  stutterCount: number;   // from Web Speech vs Whisper diff
  stutterExamples: string[];
  pauseCount: number;     // hesitation pauses (0.4–1.2s mid-sentence)
  blockCount: number;     // full blocks (>1.2s mid-sentence)
  pauseExamples: string[];
  fluencyScore: number;   // 0–100
}

interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

interface Props {
  onTranscript: (text: string) => void;
  onFinalTranscript: (text: string) => void;
  onRecordingChange: (recording: boolean) => void;
  onStutterData: (data: StutterData) => void;
  question?: string;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

// --- Method 1: Web Speech vs Whisper diff ---
// Words appearing more in raw Web Speech than in Whisper clean = likely stuttered
function diffStutters(rawText: string, cleanText: string): { count: number; examples: string[] } {
  const normalize = (t: string) =>
    t.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);

  const rawWords = normalize(rawText);
  const cleanWords = normalize(cleanText);

  const rawCounts = new Map<string, number>();
  const cleanCounts = new Map<string, number>();
  for (const w of rawWords) rawCounts.set(w, (rawCounts.get(w) || 0) + 1);
  for (const w of cleanWords) cleanCounts.set(w, (cleanCounts.get(w) || 0) + 1);

  const examples: string[] = [];
  let count = 0;
  for (const [word, rawCount] of rawCounts) {
    const cleanCount = cleanCounts.get(word) || 0;
    const diff = rawCount - cleanCount;
    if (diff >= 1) {
      count += diff;
      examples.push(`"${word}" ×${diff}`);
    }
  }
  return { count, examples: examples.slice(0, 5) };
}

// --- Method 2: Pause detection from Whisper word timestamps ---
// Smart cases: skip sentence-ending pauses, comma pauses, and first-word gap
function detectPauses(words: WhisperWord[]): { pauseCount: number; blockCount: number; examples: string[] } {
  const HESITATION_MIN = 0.4;
  const BLOCK_MIN = 1.2;
  const SENTENCE_ENDERS = /[.!?]$/;
  const COMMA = /,$/;

  let pauseCount = 0;
  let blockCount = 0;
  const examples: string[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    const gap = words[i + 1].start - words[i].end;
    const afterWord = words[i].word.trim();

    // Skip: too short (natural breath)
    if (gap < HESITATION_MIN) continue;

    // Skip: pause after sentence-ending punctuation (thinking between sentences = normal)
    if (SENTENCE_ENDERS.test(afterWord)) continue;

    // Skip: short pause after comma (natural rhythm)
    if (COMMA.test(afterWord) && gap < 1.5) continue;

    // Skip: very first gap in the answer (thinking before starting = fine)
    if (i === 0) continue;

    const nextWord = words[i + 1].word.trim();
    if (gap >= BLOCK_MIN) {
      blockCount++;
      examples.push(`${gap.toFixed(1)}s block before "${nextWord}"`);
    } else {
      pauseCount++;
      examples.push(`${gap.toFixed(1)}s pause before "${nextWord}"`);
    }
  }

  return { pauseCount, blockCount, examples: examples.slice(0, 5) };
}

// --- Combine both signals into a fluency score ---
function buildStutterData(
  diffResult: { count: number; examples: string[] },
  pauseResult: { pauseCount: number; blockCount: number; examples: string[] },
  totalWords: number
): StutterData {
  const stutterRate = totalWords > 0 ? diffResult.count / totalWords : 0;
  const pausePenalty = pauseResult.pauseCount * 3 + pauseResult.blockCount * 8;
  const fluencyScore = Math.max(0, Math.round(100 - stutterRate * 300 - pausePenalty));

  return {
    stutterCount: diffResult.count,
    stutterExamples: diffResult.examples,
    pauseCount: pauseResult.pauseCount,
    blockCount: pauseResult.blockCount,
    pauseExamples: pauseResult.examples,
    fluencyScore,
  };
}

export default function SpeechRecorder({
  onTranscript,
  onFinalTranscript,
  onRecordingChange,
  onStutterData,
  question,
}: Props) {
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [status, setStatus] = useState<"idle" | "listening" | "transcribing">("idle");

  const recordingRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const onRecordingChangeRef = useRef(onRecordingChange);
  const onStutterDataRef = useRef(onStutterData);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SRRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const rawChunksRef = useRef<string[]>([]); // raw Web Speech chunks for diff

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onFinalTranscriptRef.current = onFinalTranscript; }, [onFinalTranscript]);
  useEffect(() => { onRecordingChangeRef.current = onRecordingChange; }, [onRecordingChange]);
  useEffect(() => { onStutterDataRef.current = onStutterData; }, [onStutterData]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    SRRef.current = SR;
  }, []);

  function createAndStart() {
    const SR = SRRef.current;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interimText += t;
      }
      if (finalText) {
        rawChunksRef.current.push(finalText); // save raw for diff
        onTranscriptRef.current(finalText);
        setInterim("");
      } else {
        setInterim(interimText);
      }
    };

    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setErrorMsg("Microphone permission denied.");
        recordingRef.current = false;
        setRecording(false);
        onRecordingChangeRef.current(false);
      }
    };

    rec.onend = () => {
      setInterim("");
      if (recordingRef.current) {
        setTimeout(() => { if (recordingRef.current) createAndStart(); }, 100);
      }
    };

    try { rec.start(); } catch { /* ignore */ }
  }

  async function startAudioRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
    } catch { /* fall back to Web Speech only */ }
  }

  async function stopAudioAndTranscribe() {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder || mediaRecorder.state === "inactive") return;

    return new Promise<void>((resolve) => {
      mediaRecorder.onstop = async () => {
        mediaRecorder.stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setStatus("transcribing");
        try {
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          if (question) form.append("question", question);
          const res = await fetch("/api/transcribe", { method: "POST", body: form });
          const data = await res.json();

          if (data.transcript) onFinalTranscriptRef.current(data.transcript);

          // Combine both stutter detection methods
          const rawText = rawChunksRef.current.join(" ");
          const words: WhisperWord[] = data.words ?? [];
          const totalWords = data.transcript?.split(/\s+/).filter(Boolean).length ?? 1;

          const diffResult = rawText.trim()
            ? diffStutters(rawText, data.transcript ?? "")
            : { count: 0, examples: [] };

          const pauseResult = words.length > 0
            ? detectPauses(words)
            : { pauseCount: 0, blockCount: 0, examples: [] };

          onStutterDataRef.current(buildStutterData(diffResult, pauseResult, totalWords));
        } catch { /* silent fail */ } finally {
          setStatus("idle");
          resolve();
        }
      };
      mediaRecorder.stop();
    });
  }

  async function toggleRecording() {
    if (!SRRef.current) return;

    if (recordingRef.current) {
      recordingRef.current = false;
      setRecording(false);
      setInterim("");
      onRecordingChangeRef.current(false);
      await stopAudioAndTranscribe();
    } else {
      setErrorMsg("");
      rawChunksRef.current = [];
      recordingRef.current = true;
      setRecording(true);
      setStatus("listening");
      onRecordingChangeRef.current(true);
      await startAudioRecording();
      createAndStart();
    }
  }

  if (!supported) {
    return (
      <div className="text-red-400 text-sm text-center py-4">
        Speech recognition not supported — use Chrome or Edge.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={toggleRecording}
        disabled={status === "transcribing"}
        className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all disabled:opacity-60 ${
          recording
            ? "bg-red-500 hover:bg-red-600 text-white"
            : "bg-blue-500 hover:bg-blue-600 text-white"
        }`}
      >
        {recording ? (
          <>
            <Square size={16} />
            Stop Recording
            <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse ml-1" />
          </>
        ) : (
          <>
            <Mic size={16} />
            {status === "transcribing" ? "Transcribing..." : "Start Recording"}
          </>
        )}
      </button>

      {status === "transcribing" && (
        <p className="text-xs text-blue-400 font-mono animate-pulse">
          Whisper is transcribing your answer...
        </p>
      )}

      {errorMsg && <p className="text-red-400 text-xs text-center max-w-sm">{errorMsg}</p>}

      {interim && (
        <p className="text-gray-400 text-sm italic text-center max-w-md">
          &ldquo;{interim}&rdquo;
        </p>
      )}
    </div>
  );
}
