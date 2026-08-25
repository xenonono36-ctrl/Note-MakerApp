import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const systemPrompt = `You are Lumen, an exceptional learning companion. Turn a topic into a complete, accurate, beautifully structured study note. Write in clear Markdown. Always include: a concise overview, key ideas, important terminology, a practical example, common misconceptions, and a short review section with 3 questions. Match depth to the requested level. Never invent citations or claim certainty where the topic is debated.`;

export async function POST(request: Request) {
  try {
    const { topic, level, format, focus } = await request.json();
    if (!topic?.trim()) return NextResponse.json({ error: "Please enter a topic." }, { status: 400 });
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Add ANTHROPIC_API_KEY to your environment to generate notes." }, { status: 503 });
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 3000, system: systemPrompt, messages: [{ role: "user", content: `Topic: ${topic}\nLevel: ${level || "Intermediate"}\nFormat: ${format || "Study guide"}\nFocus: ${focus || "Balanced coverage"}` }] });
    const content = message.content.find((block) => block.type === "text");
    return NextResponse.json({ note: content?.type === "text" ? content.text : "No note was returned." });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Claude could not complete that note. Check your API key and try again." }, { status: 500 });
  }
}