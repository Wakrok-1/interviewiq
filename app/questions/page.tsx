"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft } from "lucide-react";

const STORAGE_KEY = "interviewiq_custom_questions";

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setQuestions(JSON.parse(stored));
    } catch {}
  }, []);

  function save(updated: string[]) {
    setQuestions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function addQuestion() {
    const trimmed = input.trim();
    if (!trimmed) { setError("Question cannot be empty."); return; }
    if (trimmed.length < 10) { setError("Question is too short."); return; }
    if (questions.includes(trimmed)) { setError("This question already exists."); return; }
    save([...questions, trimmed]);
    setInput("");
    setError("");
  }

  function deleteQuestion(index: number) {
    save(questions.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") addQuestion();
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Interview<span className="text-blue-400">IQ</span>
        </Link>
        <Link
          href="/interview"
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Practice
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Custom Questions</h1>
          <p className="text-gray-400 text-sm mt-1">
            Add your own interview questions. They'll be included in your practice sessions.
          </p>
        </div>

        {/* Add question */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. How do you handle tight deadlines?"
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={addQuestion}
              className="flex items-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={16} />
              Add
            </button>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        {/* Question list */}
        {questions.length === 0 ? (
          <div className="text-center py-12 text-gray-600 border border-dashed border-gray-800 rounded-xl">
            <p className="text-sm">No custom questions yet.</p>
            <p className="text-xs mt-1">Add one above to get started.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {questions.map((q, i) => (
              <li
                key={i}
                className="flex items-start justify-between gap-3 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
              >
                <p className="text-sm text-gray-200 leading-relaxed flex-1">{q}</p>
                <button
                  onClick={() => deleteQuestion(i)}
                  className="text-gray-600 hover:text-red-400 transition-colors mt-0.5 shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {questions.length > 0 && (
          <p className="text-xs text-gray-600 text-center">
            {questions.length} custom question{questions.length !== 1 ? "s" : ""} — included in practice sessions
          </p>
        )}
      </div>
    </div>
  );
}
