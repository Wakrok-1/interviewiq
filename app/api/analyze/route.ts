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

STEP 1 — Determine if this is a behavioral question.
Behavioral questions typically start with or contain: "Tell me about a time", "Describe a situation", "Give an example", "Have you ever", "When have you", or ask about past experiences, challenges, teamwork, leadership, failure, or conflict.

STEP 2 — If behavioral, evaluate using the STAR method:
- Situation: Did they set the context/background?
- Task: Did they explain their specific responsibility or challenge?
- Action: Did they clearly describe what THEY did (use of "I", specific steps)?
- Result: Did they share the outcome, impact, or what they learned?

STEP 3 — Score and provide feedback.

Return this exact JSON structure:
{
  "isBehavioral": <true or false>,
  "relevanceScore": <0-100, how well the answer addresses the question>,
  "grammarScore": <0-100, grammar and clarity>,
  "fluencyScore": <0-100, how smoothly and confidently the answer flows — penalize hesitations, filler phrases, incomplete sentences>,
  "starScore": <0-100 if behavioral, null if not — how well they used the STAR structure. Full marks only if all 4 components are clearly present>,
  "starComponents": {
    "situation": <true/false — did they set the context?>,
    "task": <true/false — did they describe their specific challenge/responsibility?>,
    "action": <true/false — did they explain what THEY specifically did?>,
    "result": <true/false — did they share the outcome or impact?>
  },
  "overallScore": <0-100 — if behavioral: weight starScore at 40%, relevance 30%, grammar 15%, fluency 15%. If not behavioral: relevance 50%, grammar 25%, fluency 25%>,
  "strengths": [<up to 2 short bullet points of what was done well>],
  "improvements": [<up to 2 short bullet points of what to improve — if behavioral and STAR components missing, mention them>],
  "tip": "<one specific, actionable tip — if behavioral and STAR is weak, give a STAR-specific tip>"
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
