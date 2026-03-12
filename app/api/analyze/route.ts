import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });
  }

  const { question, transcript } = await req.json();

  if (!question || !transcript) {
    return NextResponse.json({ error: "Missing question or transcript" }, { status: 400 });
  }

  const prompt = `You are an expert interview coach. Analyze the following interview answer and return a JSON object only — no extra text.

Interview Question: "${question}"
Candidate's Answer: "${transcript}"

Return this exact JSON structure:
{
  "relevanceScore": <0-100, how well the answer addresses the question>,
  "grammarScore": <0-100, grammar and clarity quality>,
  "fluencyScore": <0-100, how smoothly and confidently the answer flows — penalize hesitations, filler phrases, incomplete sentences, abrupt stops>,
  "overallScore": <0-100, weighted combination of all three scores>,
  "strengths": [<up to 2 short bullet points of what was done well>],
  "improvements": [<up to 2 short bullet points of what to improve>],
  "tip": "<one specific, actionable tip to improve this answer>"
}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: err }, { status: response.status });
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);
  return NextResponse.json(result);
}
