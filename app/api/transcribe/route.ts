import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });
  }

  const formData = await req.formData();
  const audio = formData.get("audio") as File;
  const question = formData.get("question") as string | null;

  if (!audio) {
    return NextResponse.json({ error: "No audio provided" }, { status: 400 });
  }

  const cleanPrompt = question
    ? `Interview question: "${question}". Answer about work experience, software development, IT, third-party tools, APIs, frameworks, company policies.`
    : "Interview answer about work experience, software development, IT, third-party tools, APIs, frameworks, company policies.";

  // Stutter prompt: preserve repetitions + get word timestamps for pause detection
  const stutterPrompt =
    "Transcribe exactly as spoken. Preserve all word repetitions, stutters, false starts, and filler sounds like um, uh, umm, uhh. Do not remove or clean up any repeated words. Example: 'I I I was um um going to the the store'";

  const [cleanRes, stutterRes] = await Promise.all([
    fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: (() => {
        const f = new FormData();
        f.append("file", audio, "recording.webm");
        f.append("model", "whisper-large-v3");
        f.append("language", "en");
        f.append("prompt", cleanPrompt);
        return f;
      })(),
    }),
    fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: (() => {
        const f = new FormData();
        f.append("file", audio, "recording.webm");
        f.append("model", "whisper-large-v3");
        f.append("language", "en");
        f.append("response_format", "verbose_json");
        f.append("timestamp_granularities[]", "word");
        f.append("prompt", stutterPrompt);
        f.append("temperature", "0");
        return f;
      })(),
    }),
  ]);

  if (!cleanRes.ok) {
    const err = await cleanRes.text();
    return NextResponse.json({ error: err }, { status: cleanRes.status });
  }

  const cleanData = await cleanRes.json();
  const words = stutterRes.ok ? (await stutterRes.json()).words ?? [] : [];

  return NextResponse.json({ transcript: cleanData.text, words });
}
