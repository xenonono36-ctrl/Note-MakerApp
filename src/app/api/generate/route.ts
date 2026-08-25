import { NextResponse } from "next/server";

const systemPrompt = `You are Lumen, an expert study-guide author and careful source analyst. Produce a complete, accurate, useful study guide in Markdown.

Output contract: begin with exactly one level-1 heading containing the topic. Use level-2 headings for major sections. Include these sections when relevant: Overview, Key Concepts and Definitions, Important Details and Examples, Source Summaries, Connections Across Sources, Diagrams or Tables, Practice Questions with Answers, Exam-Style Points, Key Takeaways, and Quick Revision Checklist. Keep explanations clear and layered for the requested level. Use bullets, numbered steps, Markdown tables, and fenced code blocks for diagrams when they improve understanding. Write mathematical notation as LaTeX surrounded by $ for inline math or $$ for display math.

Evidence rules: when sources are attached, use ONLY those sources. Do not add general knowledge, invented examples, citations, or facts. Attribute claims to the source filename when possible. If the sources are unclear, incomplete, contradictory, or do not answer part of the topic, state that plainly. Never output analysis, apologies, or code fences around the entire guide.`;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const topic = String(formData.get("topic") || "");
    const level = String(formData.get("level") || "Intermediate");
    const format = String(formData.get("format") || "Study guide");
    const focus = String(formData.get("focus") || "Balanced coverage");
    const goal = String(formData.get("goal") || "Understand and remember the key information");
    const files = formData.getAll("sources").filter((value): value is File => value instanceof File && value.size > 0);
    if (!topic?.trim()) return NextResponse.json({ error: "Please enter a topic." }, { status: 400 });
    if (files.length > 8) return NextResponse.json({ error: "Please attach no more than 8 source files." }, { status: 400 });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Add GEMINI_API_KEY to .env.local to generate notes." }, { status: 503 });
    const sourceParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: `${file.name} is larger than the 20 MB limit.` }, { status: 413 });
      if (file.type === "application/pdf") {
        sourceParts.push({ inlineData: { mimeType: file.type, data: Buffer.from(await file.arrayBuffer()).toString("base64") } });
      } else if (["text/plain", "text/markdown", "text/html"].includes(file.type) || /\.(txt|md|html?)$/i.test(file.name)) {
        sourceParts.push({ text: `SOURCE FILE: ${file.name}\n${await file.text()}` });
      } else {
        return NextResponse.json({ error: `${file.name} is not supported. Attach PDF, TXT, MD, or HTML files.` }, { status: 415 });
      }
    }
    sourceParts.push({ text: `Create the study guide for this topic: ${topic}\nLevel: ${level}\nFormat: ${format}\nFocus: ${focus}\nGoal: ${goal}\n\nWhen sources are attached, use only those sources as evidence. Clearly say when the sources do not contain enough information. Do not invent facts or citations.` });
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: sourceParts }],
        generationConfig: { maxOutputTokens: 6000, temperature: 0.2 },
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      const message = data.error?.message || "Gemini could not complete that note.";
      return NextResponse.json({ error: message }, { status: response.status });
    }
    let content = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || "").join("").trim();
    if (content) {
      content = content.replace(/^```(?:markdown|md)?\s*/i, "").replace(/\s*```$/i, "").trim();
      if (!/^#\s+.+/m.test(content)) content = `# ${topic}\n\n${content}`;
    }
    return NextResponse.json({ note: content || `# ${topic}\n\nNo note was returned.` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Gemini could not complete that note. Check your API key and try again." }, { status: 500 });
  }
}