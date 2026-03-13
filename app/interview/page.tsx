"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, RotateCcw, Settings } from "lucide-react";
import CameraFeed from "@/components/CameraFeed";
import SpeechRecorder, { type StutterData } from "@/components/SpeechRecorder";
import FeedbackPanel from "@/components/FeedbackPanel";
import { createClient } from "@/lib/supabase";

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

function randomFrom(pool: string[], exclude?: string) {
  const filtered = pool.filter((q) => q !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

interface Metrics {
  eyeContact: boolean;
  posture: "good" | "poor" | "unknown";
}

interface AIFeedback {
  isBehavioral: boolean;
  relevanceScore: number;
  grammarScore: number;
  fluencyScore: number;
  starScore: number | null;
  starComponents: {
    situation: boolean;
    task: boolean;
    action: boolean;
    result: boolean;
  } | null;
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
  const [allQuestions, setAllQuestions] = useState<string[]>(DEFAULT_QUESTIONS);

  // Load custom questions from Supabase if signed in
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: rows } = await supabase
          .from("custom_questions")
          .select("question");
        if (rows && rows.length > 0) {
          setAllQuestions([...DEFAULT_QUESTIONS, ...rows.map((r: { question: string }) => r.question)]);
        }
      }
    });
  }, []);

  useEffect(() => {
    setQuestion(randomFrom(allQuestions));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allQuestions]);

  const handleTranscript = useCallback((text: string) => {
    setTranscript((prev) => (prev ? prev + " " + text : text));
  }, []);

  const handleFinalTranscript = useCallback((text: string) => {
    setTranscript(text);
  }, []);

  const handleMetrics = useCallback((m: Metrics) => {
    setMetrics(m);
  }, []);

  const handleStutterData = useCallback((data: StutterData) => {
    setStutterData(data);
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

  function nextQuestion() {
    setQuestion(randomFrom(allQuestions, question));
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
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-3.5 flex items-center justify-between shrink-0">
        <Link href="/" className="text-lg font-bold">
          Interview<span className="text-blue-400">IQ</span>
        </Link>
        <div className="flex items-center gap-5">
          <Link
            href="/questions"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <Settings size={14} />
            Questions
          </Link>
          <span className="text-xs text-gray-600 bg-gray-800 px-2.5 py-1 rounded-full">
            Question #{questionIndex}
          </span>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-6 items-stretch">

        {/* Left: Camera fills column height, metrics + tip at bottom */}
        <div className="flex flex-col gap-3">
          <CameraFeed
            onMetrics={handleMetrics}
            className="relative rounded-xl overflow-hidden bg-gray-900 w-full flex-1 min-h-[240px]"
          />

          {/* Live metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-lg px-3 py-2 text-xs font-medium text-center border transition-colors ${
              metrics.eyeContact
                ? "bg-green-900/20 border-green-800 text-green-400"
                : "bg-red-900/20 border-red-900 text-red-400"
            }`}>
              👁 {metrics.eyeContact ? "Eye contact good" : "Look at camera"}
            </div>
            <div className={`rounded-lg px-3 py-2 text-xs font-medium text-center border transition-colors ${
              metrics.posture === "good"
                ? "bg-green-900/20 border-green-800 text-green-400"
                : "bg-yellow-900/20 border-yellow-900 text-yellow-400"
            }`}>
              🪑 {metrics.posture === "good" ? "Posture good" : "Sit straight"}
            </div>
          </div>

          {/* Tip — sits at the bottom, same level as Submit Answer */}
          {!submitted && (
            <p className="text-xs text-gray-600 text-center px-2">
              Speak clearly and look at the camera throughout your answer.
            </p>
          )}
        </div>

        {/* Right: Question + Answer + Feedback */}
        <div className="flex flex-col gap-4">

          {/* Question card */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-widest mb-2.5">
              Interview Question
            </p>
            <p className="text-xl font-semibold text-white leading-snug">{question}</p>
          </div>

          {/* Recording phase */}
          {!submitted && (
            <div className="flex flex-col gap-4 flex-1">
              {/* Transcript box — grows to fill available space */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col flex-1">
                <div className="px-4 pt-3 pb-1 border-b border-gray-800/60 shrink-0">
                  <p className="text-xs text-gray-500 font-medium">Your answer</p>
                </div>
                <div className="px-4 py-3 flex-1 overflow-y-auto min-h-[120px]">
                  {transcript ? (
                    <p className="text-sm text-gray-200 leading-relaxed">{transcript}</p>
                  ) : (
                    <p className="text-sm text-gray-600 italic">
                      {recording ? "Listening — speak your answer..." : "Click Start Recording to begin"}
                    </p>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 shrink-0">
                <div className="flex flex-col items-center gap-4">
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
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 disabled:opacity-30 transition-colors"
                    >
                      <RotateCcw size={13} />
                      Clear
                    </button>
                    <button
                      onClick={submitAnswer}
                      disabled={!transcript.trim() || recording}
                      className="flex items-center gap-1.5 px-6 py-2 rounded-lg text-sm font-semibold bg-blue-500 hover:bg-blue-600 disabled:opacity-30 transition-colors"
                    >
                      Submit Answer
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feedback phase */}
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
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                Next Question
                <ChevronRight size={17} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
