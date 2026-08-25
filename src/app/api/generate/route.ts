import { NextResponse } from "next/server";

const systemPrompt = `You are Lumen, an exceptional learning companion. Turn a topic into a complete, accurate, beautifully structured study note. Write in clear Markdown. Always include: a concise overview, key ideas, important terminology, a practical example, common misconceptions, and a short review section with 3 questions. Match depth to the requested level. Never invent citations or claim certainty where the topic is debated.`;

export async function POST(request: Request) {
  try {
    const { topic, level, format, focus } = await request.json();
    if (!topic?.trim()) return NextResponse.json({ error: "Please enter a topic." }, { status: 400 });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Add GEMINI_API_KEY to .env.local to generate notes." }, { status: 503 });
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: `Topic: ${topic}\nLevel: ${level || "Intermediate"}\nFormat: ${format || "Study guide"}\nFocus: ${focus || "Balanced coverage"}` }] }],
        generationConfig: { maxOutputTokens: 3000 },
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      const message = data.error?.message || "Gemini could not complete that note.";
      return NextResponse.json({ error: message }, { status: response.status });
    }
    const content = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
    return NextResponse.json({ note: content || "No note was returned." });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gemini could not complete that note. Check your API key and try again." }, { status: 500 });
  }
}