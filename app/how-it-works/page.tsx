import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const sections = [
  {
    title: "Speech Transcription",
    icon: "🎙️",
    tech: "Groq Whisper large-v3",
    description:
      "Your voice is recorded using the browser's MediaRecorder API. When you stop recording, the audio is sent to Groq's Whisper large-v3 model — the same model that powers many professional transcription services. It outperforms browser-native speech recognition especially with accents, technical terms, and natural speech patterns.",
    details: [
      "Live interim text is shown while you speak via Web Speech API",
      "Final accurate transcript is produced by Whisper after you stop",
      "The current interview question is passed as context to improve domain accuracy",
    ],
  },
  {
    title: "Answer Analysis",
    icon: "🧠",
    tech: "Llama 3.3 70B via Groq",
    description:
      "Your transcript and the interview question are sent to Llama 3.3 70B — a state-of-the-art open-source language model with 70 billion parameters. It evaluates your answer the way an experienced interviewer would, not with keyword matching or random numbers.",
    details: [
      "Relevance score: how well your answer actually addresses the question",
      "Grammar & clarity score: sentence structure, coherence, and fluency",
      "Overall score: weighted combination of both",
      "Strengths: what you did well in this specific answer",
      "Improvements: specific gaps or missing elements",
      "Pro tip: one actionable suggestion to improve your next attempt",
    ],
  },
  {
    title: "Eye Contact Detection",
    icon: "👁️",
    tech: "MediaPipe FaceLandmarker",
    description:
      "Your camera feed is processed entirely in the browser using Google's MediaPipe FaceLandmarker model. It maps 478 facial landmarks in real time, including the iris positions. No video ever leaves your device.",
    details: [
      "Iris center position is tracked relative to each eye's inner and outer corners",
      "A ratio is calculated: if the iris is centred (0.3–0.7 range), you're looking at the camera",
      "Both eyes must pass the check simultaneously for eye contact to register as good",
    ],
  },
  {
    title: "Posture Detection",
    icon: "🪑",
    tech: "MediaPipe FaceLandmarker",
    description:
      "Using the same face landmark model, posture is inferred from head position — a strong proxy for how upright and engaged you appear without requiring a full-body camera view.",
    details: [
      "Ear span measures head yaw — if ears are too close, your head is turned away",
      "Nose-to-ear vertical ratio measures head pitch — if your nose drops too low, your head is tilted down",
      "Poor posture triggers when either metric falls outside the acceptable range",
    ],
  },
  {
    title: "Filler Word Detection",
    icon: "🗣️",
    tech: "Client-side text analysis",
    description:
      "Filler words are detected locally in the browser using regex pattern matching against your transcript. No external API is needed for this step.",
    details: [
      'Tracked words: "um", "uh", "like", "you know", "basically", "literally", "actually", "so", "right"',
      "Each occurrence is counted and flagged individually",
      "Score penalty increases with filler count — 0 is ideal, 1–3 is acceptable, 4+ needs work",
    ],
  },
  {
    title: "Scoring System",
    icon: "📊",
    tech: "AI + rule-based hybrid",
    description:
      "The overall score is produced by the AI model, not a formula. However, body language and filler word metrics are computed locally and displayed alongside to give a full picture.",
    details: [
      "AI overall score: 0–100, determined by Llama 3.3 70B based on content quality",
      "Relevance and grammar are sub-scores from the same AI analysis",
      "Eye contact, posture, and filler words are independent signals shown separately",
      "Nothing is random — every metric is derived from a real measurement",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Interview<span className="text-blue-400">IQ</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-12">
        <div>
          <h1 className="text-3xl font-bold mb-3">How It Works</h1>
          <p className="text-gray-400 leading-relaxed">
            Every score and signal in InterviewIQ is derived from a real measurement. Here's exactly what runs under the hood — no black boxes.
          </p>
        </div>

        {sections.map((section) => (
          <div key={section.title} className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{section.icon}</span>
              <div>
                <h2 className="text-xl font-bold">{section.title}</h2>
                <span className="text-xs text-blue-400 font-mono">{section.tech}</span>
              </div>
            </div>

            <p className="text-gray-300 leading-relaxed text-sm">{section.description}</p>

            <ul className="space-y-2">
              {section.details.map((d, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-400">
                  <span className="text-blue-400 mt-0.5 shrink-0">→</span>
                  {d}
                </li>
              ))}
            </ul>

            <div className="border-b border-gray-800" />
          </div>
        ))}

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-sm text-gray-400 space-y-2">
          <p className="text-white font-semibold text-base">Privacy</p>
          <p>Your camera and microphone are only used locally for analysis. Video frames are processed in-browser by MediaPipe — they are never uploaded. Audio is sent to Groq's API only for transcription and is not stored.</p>
        </div>

        <div className="text-center">
          <Link
            href="/interview"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Start Practicing
          </Link>
        </div>
      </div>
    </div>
  );
}
