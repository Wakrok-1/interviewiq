"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, RotateCcw, Settings } from "lucide-react";
import CameraFeed from "@/components/CameraFeed";
import SpeechRecorder, { type StutterData } from "@/components/SpeechRecorder";
import FeedbackPanel from "@/components/FeedbackPanel";

const DEFAULT_QUESTIONS = [
  "Tell me about yourself.",
  "What is your greatest strength?",
  "What is your greatest weakness?",
  "Describe a challenge you faced at work and how you overcame it.",
  "Where do you see yourself in 5 years?",
  "Why do you want to work here?",
  "Tell me about a time you worked in a team.",
  "Describe a situation where you showed leadership.",
  "How do you prioritize tasks when you have multiple deadlines?",
  "How do you handle receiving critical feedback?",
  "Tell me about a project you are proud of.",
  "What motivates you in your work?",
  "How do you approach learning a new technology?",
  "Describe a time you failed and what you learned from it.",
];

const STORAGE_KEY = "interviewiq_custom_questions";

function getAllQuestions(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const custom: string[] = stored ? JSON.parse(stored) : [];
    return [...DEFAULT_QUESTIONS, ...custom];
  } catch {
    return DEFAULT_QUESTIONS;
  }
}

function randomQuestion(exclude?: string) {
  const pool = getAllQuestions().filter((q) => q !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

interface Metrics {
  eyeContact: boolean;
  posture: "good" | "poor" | "unknown";
}

interface AIFeedback {
  relevanceScore: number;
  grammarScore: number;
  fluencyScore: number;
  overallScore: number;
  strengths: string[];
  improvements: string[];
  tip: string;
}

export default function InterviewPage() {
  const [question, setQuestion] = useState("");
  const [transcript, setTranscript] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({ eyeContact: false, posture: "unknown" });
  const [questionIndex, setQuestionIndex] = useState(1);
  const [aiFeedback, setAiFeedback] = useState<AIFeedback | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [stutterData, setStutterData] = useState<StutterData | null>(null);

  useEffect(() => { setQuestion(randomQuestion()); }, []);

  const handleTranscript = useCallback((text: string) => {
    setTranscript((prev) => (prev ? prev + " " + text : text));
  }, []);

  const handleFinalTranscript = useCallback((text: string) => {
    setTranscript(text);
  }, []);

  const handleMetrics = useCallback((m: Metrics) => {
    setMetrics(m);
  }, []);

  async function submitAnswer() {
    if (!transcript.trim()) return;
    setSubmitted(true);
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, transcript }),
      });
      const data = await res.json();
      setAiFeedback(data);
    } catch {
      // feedback panel still shows body language metrics
    } finally {
      setAnalyzing(false);
    }
  }

  const handleStutterData = useCallback((data: StutterData) => {
    setStutterData(data);
  }, []);

  function nextQuestion() {
    setQuestion(randomQuestion(question));
    setTranscript("");
    setSubmitted(false);
    setAiFeedback(null);
    setStutterData(null);
    setQuestionIndex((n) => n + 1);
  }

  function resetAnswer() {
    setTranscript("");
    setSubmitted(false);
    setAiFeedback(null);
    setStutterData(null);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Interview<span className="text-blue-400">IQ</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/questions"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <Settings size={15} />
            Questions
          </Link>
          <span className="text-gray-500 text-sm">#{questionIndex}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Camera + live metrics */}
        <div className="space-y-4">
          <CameraFeed onMetrics={handleMetrics} />
          <div className="flex gap-3">
            <div className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium text-center border ${
              metrics.eyeContact
                ? "bg-green-900/30 border-green-700 text-green-400"
                : "bg-red-900/30 border-red-800 text-red-400"
            }`}>
              👁 Eye Contact: {metrics.eyeContact ? "Good" : "Look at camera"}
            </div>
            <div className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium text-center border ${
              metrics.posture === "good"
                ? "bg-green-900/30 border-green-700 text-green-400"
                : "bg-yellow-900/30 border-yellow-700 text-yellow-400"
            }`}>
              🪑 Posture: {metrics.posture === "good" ? "Good" : "Sit straight"}
            </div>
          </div>
        </div>

        {/* Right: Question + Answer + Feedback */}
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide mb-2">
              Interview Question
            </p>
            <p className="text-lg font-medium text-white leading-snug">{question}</p>
          </div>

          {!submitted && (
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 min-h-[100px] max-h-[200px] overflow-y-auto">
              <p className="text-xs text-gray-500 mb-2">Your answer (live transcript)</p>
              {transcript ? (
                <p className="text-sm text-gray-200 leading-relaxed">{transcript}</p>
              ) : (
                <p className="text-sm text-gray-600 italic">
                  {recording ? "Listening..." : "Press Start Recording to begin your answer"}
                </p>
              )}
            </div>
          )}

          {!submitted && (
            <div className="flex flex-col items-center gap-3">
              <SpeechRecorder
                onTranscript={handleTranscript}
                onFinalTranscript={handleFinalTranscript}
                onRecordingChange={setRecording}
                onStutterData={handleStutterData}
                question={question}
              />
              <div className="flex gap-3">
                <button
                  onClick={resetAnswer}
                  disabled={!transcript}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 disabled:opacity-30 transition-colors"
                >
                  <RotateCcw size={14} />
                  Clear
                </button>
                <button
                  onClick={submitAnswer}
                  disabled={!transcript.trim() || recording}
                  className="flex items-center gap-1 px-6 py-2 rounded-lg text-sm font-semibold bg-blue-500 hover:bg-blue-600 disabled:opacity-30 transition-colors"
                >
                  Submit Answer
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {submitted && (
            <>
              <FeedbackPanel
                transcript={transcript}
                eyeContact={metrics.eyeContact}
                posture={metrics.posture}
                aiFeedback={aiFeedback}
                analyzing={analyzing}
                stutterData={stutterData}
              />
              <button
                onClick={nextQuestion}
                disabled={analyzing}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                Next Question
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
