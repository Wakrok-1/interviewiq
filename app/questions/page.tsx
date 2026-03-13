"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export default function QuestionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [questions, setQuestions] = useState<{ id: string; question: string }[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) loadQuestions();
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadQuestions();
      else { setQuestions([]); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadQuestions() {
    setLoading(true);
    const { data } = await supabase
      .from("custom_questions")
      .select("id, question")
      .order("created_at", { ascending: true });
    setQuestions(data ?? []);
    setLoading(false);
  }

  function goToAuth() {
    router.push("/auth");
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function addQuestion() {
    const trimmed = input.trim();
    if (!trimmed) { setError("Question cannot be empty."); return; }
    if (trimmed.length < 10) { setError("Question is too short."); return; }
    if (questions.some((q) => q.question === trimmed)) { setError("This question already exists."); return; }

    const { data, error: err } = await supabase
      .from("custom_questions")
      .insert({ question: trimmed, user_id: user!.id })
      .select("id, question")
      .single();

    if (err) { setError("Failed to save. Try again."); return; }
    setQuestions((prev) => [...prev, data]);
    setInput("");
    setError("");
  }

  async function deleteQuestion(id: string) {
    await supabase.from("custom_questions").delete().eq("id", id);
    setQuestions((prev) => prev.filter((q) => q.id !== id));
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
        <div className="flex items-center gap-4">
          {user && (
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <LogOut size={14} />
              Sign out
            </button>
          )}
          <Link
            href="/interview"
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Practice
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Custom Questions</h1>
          <p className="text-gray-400 text-sm mt-1">
            Add your own interview questions. They'll be included in your practice sessions.
          </p>
        </div>

        {/* Not signed in */}
        {!user && !loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center space-y-4">
            <p className="text-white font-semibold">Sign in to save custom questions</p>
            <p className="text-gray-400 text-sm">
              Your questions are saved to your account and synced across devices.
            </p>
            <button
              onClick={goToAuth}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold text-sm transition-colors"
            >
              Sign in / Sign up
            </button>
          </div>
        )}

        {/* Signed in */}
        {user && (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              Signed in as <span className="text-gray-300">{user.email}</span>
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
            {loading ? (
              <div className="text-center py-8 text-gray-600 text-sm">Loading...</div>
            ) : questions.length === 0 ? (
              <div className="text-center py-12 text-gray-600 border border-dashed border-gray-800 rounded-xl">
                <p className="text-sm">No custom questions yet.</p>
                <p className="text-xs mt-1">Add one above to get started.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {questions.map((q) => (
                  <li
                    key={q.id}
                    className="flex items-start justify-between gap-3 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
                  >
                    <p className="text-sm text-gray-200 leading-relaxed flex-1">{q.question}</p>
                    <button
                      onClick={() => deleteQuestion(q.id)}
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
          </>
        )}
      </div>
    </div>
  );
}
