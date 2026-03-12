import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div>
          <h1 className="text-5xl font-bold tracking-tight mb-3">
            Interview<span className="text-blue-400">IQ</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Practice interviews with real-time AI feedback on your answers,
            body language, and communication.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-left">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-blue-400 text-2xl mb-2">🎯</div>
            <h3 className="font-semibold mb-1">Smart Questions</h3>
            <p className="text-gray-400">Randomized interview questions across multiple categories</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-blue-400 text-2xl mb-2">👁️</div>
            <h3 className="font-semibold mb-1">Body Language</h3>
            <p className="text-gray-400">Real-time eye contact and posture detection via camera</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-blue-400 text-2xl mb-2">🗣️</div>
            <h3 className="font-semibold mb-1">Speech Analysis</h3>
            <p className="text-gray-400">Detects filler words, grammar, and answer quality</p>
          </div>
        </div>

        <Link
          href="/interview"
          className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
        >
          Start Practice Interview
        </Link>

        <p className="text-gray-600 text-sm">
          Requires camera and microphone access
        </p>

        <Link
          href="/how-it-works"
          className="text-gray-500 hover:text-gray-300 text-sm underline underline-offset-4 transition-colors"
        >
          How does the scoring work?
        </Link>
      </div>
    </main>
  );
}
