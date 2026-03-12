"use client";

interface AIFeedback {
  relevanceScore: number;
  grammarScore: number;
  fluencyScore: number;
  overallScore: number;
  strengths: string[];
  improvements: string[];
  tip: string;
}

interface StutterData {
  stutterCount: number;
  stutterExamples: string[];
  pauseCount: number;
  blockCount: number;
  pauseExamples: string[];
  fluencyScore: number;
}

interface Props {
  transcript: string;
  eyeContact: boolean;
  posture: "good" | "poor" | "unknown";
  aiFeedback: AIFeedback | null;
  analyzing: boolean;
  stutterData: StutterData | null;
}

const FILLER_WORDS = ["um", "uh", "like", "you know", "basically", "literally", "actually", "so", "right"];

function analyzeFillers(text: string) {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const word of FILLER_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const matches = lower.match(regex);
    if (matches) for (let i = 0; i < matches.length; i++) found.push(word);
  }
  return { count: found.length, words: [...new Set(found)] };
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
      <div
        className={`h-1.5 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

function scoreColor(score: number) {
  if (score >= 75) return { text: "text-green-400", bar: "bg-green-400" };
  if (score >= 50) return { text: "text-yellow-400", bar: "bg-yellow-400" };
  return { text: "text-red-400", bar: "bg-red-400" };
}

export default function FeedbackPanel({ transcript, eyeContact, posture, aiFeedback, analyzing, stutterData }: Props) {
  if (!transcript) {
    return (
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 text-gray-500 text-sm text-center">
        Your feedback will appear here after you answer.
      </div>
    );
  }

  const fillers = analyzeFillers(transcript);
  const words = transcript.trim().split(/\s+/).length;

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-4">

      {/* AI Scores */}
      {analyzing && (
        <div className="flex items-center gap-2 text-sm text-blue-400 animate-pulse">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          Analyzing your answer with AI...
        </div>
      )}

      {aiFeedback && (
        <>
          {/* Overall score */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Answer Feedback</h3>
            <span className={`text-2xl font-bold ${scoreColor(aiFeedback.overallScore).text}`}>
              {aiFeedback.overallScore}/100
            </span>
          </div>

          {/* Score breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Answer Relevance</p>
              <p className={`font-semibold text-sm ${scoreColor(aiFeedback.relevanceScore).text}`}>
                {aiFeedback.relevanceScore}/100
              </p>
              <ScoreBar score={aiFeedback.relevanceScore} color={scoreColor(aiFeedback.relevanceScore).bar} />
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Grammar & Clarity</p>
              <p className={`font-semibold text-sm ${scoreColor(aiFeedback.grammarScore).text}`}>
                {aiFeedback.grammarScore}/100
              </p>
              <ScoreBar score={aiFeedback.grammarScore} color={scoreColor(aiFeedback.grammarScore).bar} />
            </div>
            {aiFeedback.fluencyScore !== undefined && (
              <div className="bg-gray-800 rounded-lg p-3 col-span-2">
                <p className="text-gray-400 text-xs mb-1">Speech Fluency</p>
                <p className={`font-semibold text-sm ${scoreColor(aiFeedback.fluencyScore).text}`}>
                  {aiFeedback.fluencyScore}/100
                </p>
                <ScoreBar score={aiFeedback.fluencyScore} color={scoreColor(aiFeedback.fluencyScore).bar} />
              </div>
            )}
          </div>

          {/* Strengths */}
          {aiFeedback.strengths.length > 0 && (
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-3">
              <p className="text-green-400 text-xs font-semibold mb-2">STRENGTHS</p>
              <ul className="space-y-1">
                {aiFeedback.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-gray-300 flex gap-2">
                    <span className="text-green-400 mt-0.5">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {aiFeedback.improvements.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
              <p className="text-yellow-400 text-xs font-semibold mb-2">IMPROVEMENTS</p>
              <ul className="space-y-1">
                {aiFeedback.improvements.map((s, i) => (
                  <li key={i} className="text-sm text-gray-300 flex gap-2">
                    <span className="text-yellow-400 mt-0.5">→</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tip */}
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
            <p className="text-blue-400 text-xs font-semibold mb-1">PRO TIP</p>
            <p className="text-sm text-gray-300">{aiFeedback.tip}</p>
          </div>
        </>
      )}

      {/* Body language + filler metrics */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Word Count</p>
          <p className="font-semibold text-white">{words} words</p>
          <p className="text-xs text-gray-500 mt-1">
            {words < 30 ? "Too short — elaborate more" : words > 200 ? "A bit long" : "Good length"}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Filler Words</p>
          <p className={`font-semibold ${fillers.count === 0 ? "text-green-400" : fillers.count <= 3 ? "text-yellow-400" : "text-red-400"}`}>
            {fillers.count} detected
          </p>
          {fillers.words.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">"{fillers.words.join('", "')}"</p>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Eye Contact</p>
          <p className={`font-semibold ${eyeContact ? "text-green-400" : "text-red-400"}`}>
            {eyeContact ? "Good" : "Needs Work"}
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Posture</p>
          <p className={`font-semibold ${posture === "good" ? "text-green-400" : "text-yellow-400"}`}>
            {posture === "good" ? "Good" : posture === "poor" ? "Sit straight" : "Unknown"}
          </p>
        </div>

        {stutterData && (
          <div className="bg-gray-800 rounded-lg p-3 col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-xs">Speech Fluency</p>
              <p className={`text-xs font-semibold ${scoreColor(stutterData.fluencyScore).text}`}>
                {stutterData.fluencyScore}/100
              </p>
            </div>
            <ScoreBar score={stutterData.fluencyScore} color={scoreColor(stutterData.fluencyScore).bar} />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Repetitions</p>
                <p className={`text-xs font-semibold ${
                  stutterData.stutterCount === 0 ? "text-green-400" :
                  stutterData.stutterCount <= 2 ? "text-yellow-400" : "text-red-400"
                }`}>
                  {stutterData.stutterCount === 0 ? "None" : `${stutterData.stutterCount} detected`}
                </p>
                {stutterData.stutterExamples.length > 0 && (
                  <p className="text-xs text-gray-600 mt-0.5">{stutterData.stutterExamples.join(", ")}</p>
                )}
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Pauses / Blocks</p>
                <p className={`text-xs font-semibold ${
                  stutterData.pauseCount === 0 && stutterData.blockCount === 0 ? "text-green-400" :
                  stutterData.blockCount > 0 ? "text-red-400" : "text-yellow-400"
                }`}>
                  {stutterData.pauseCount === 0 && stutterData.blockCount === 0
                    ? "None"
                    : `${stutterData.pauseCount} pause${stutterData.pauseCount !== 1 ? "s" : ""}, ${stutterData.blockCount} block${stutterData.blockCount !== 1 ? "s" : ""}`}
                </p>
                {stutterData.pauseExamples.length > 0 && (
                  <p className="text-xs text-gray-600 mt-0.5">{stutterData.pauseExamples[0]}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transcript */}
      <div className="bg-gray-800 rounded-lg p-3">
        <p className="text-gray-400 text-xs mb-2">Your Answer</p>
        <p className="text-sm text-gray-300 leading-relaxed">{transcript}</p>
      </div>
    </div>
  );
}
