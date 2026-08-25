import { NextResponse } from "next/server";

const systemPrompt = `You are Lumen, an expert study-guide author and careful source analyst. Produce a complete, accurate, useful study guide in Markdown.

Output contract: begin with exactly one level-1 heading containing the topic. Use level-2 headings for major sections. Include these sections when relevant: Overview, Key Concepts and Definitions, Important Details and Examples, Source Summaries, Connections Across Sources, Diagrams or Tables, Practice Questions with Answers, Exam-Style Points, Key Takeaways, and Quick Revision Checklist. Keep explanations clear and layered for the requested level. Use bullets, numbered steps, Markdown tables, and fenced code blocks for diagrams when they improve understanding. Write mathematical notation as LaTeX surrounded by $ for inline math or $$ for display math. Make the guide teach the material, not merely list or repeat the source text. Define important terms, explain cause and effect, preserve meaningful details, and connect ideas across sources. Before finishing, silently check that every major topic and source has been covered; prioritize complete coverage over decorative prose.

Evidence rules: when sources are attached, treat them as the factual authority. Do not invent source claims, citations, examples, or numbers. You may use the topic and requested learning goal to organize and explain information that is explicitly present in the sources. Attribute important claims to the source filename when useful. Compare sources when they overlap or disagree. If the sources are unclear, incomplete, contradictory, or do not answer part of the topic, state that plainly in the relevant section while still making the strongest useful guide possible. Never output analysis, apologies, or code fences around the entire guide.`;

const maxTextSourceCharacters = 80_000;
const maxCombinedTextCharacters = 240_000;

function cleanHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const topic = String(formData.get("topic") || "");
    const level = String(formData.get("level") || "Intermediate");
    const format = String(formData.get("format") || "Study guide");
    const focus = String(formData.get("focus") || "Balanced coverage");
    const goal = String(formData.get("goal") || "Understand and remember the key information");
    const prepAmount = Number(formData.get("prepAmount") || 45);
    const prepUnit = String(formData.get("prepUnit") || "minutes");
    const files = formData.getAll("sources").filter((value): value is File => value instanceof File && value.size > 0);
    if (!topic?.trim()) return NextResponse.json({ error: "Please enter a topic." }, { status: 400 });
    const multiplier = prepUnit === "days" ? 24 * 60 : prepUnit === "hours" ? 60 : 1;
    const safePrepMinutes = Math.min(30 * 24 * 60, Math.max(15, Math.round((prepAmount || 45) * multiplier)));
    if (files.length > 8) return NextResponse.json({ error: "Please attach no more than 8 source files." }, { status: 400 });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Add GEMINI_API_KEY to .env.local to generate notes." }, { status: 503 });
    const sourceParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
    let combinedTextCharacters = 0;
    let omittedTextSources = 0;
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: `${file.name} is larger than the 20 MB limit.` }, { status: 413 });
      if (file.type === "application/pdf") {
        sourceParts.push({ text: `SOURCE FILE: ${file.name}\nThe following document is the complete PDF source for this filename.` });
        sourceParts.push({ inlineData: { mimeType: file.type, data: Buffer.from(await file.arrayBuffer()).toString("base64") } });
      } else if (["text/plain", "text/markdown", "text/html"].includes(file.type) || /\.(txt|md|html?)$/i.test(file.name)) {
        const rawText = await file.text();
        const sourceText = /\.(html?)$/i.test(file.name) || file.type === "text/html" ? cleanHtml(rawText) : rawText.trim();
        const remainingCharacters = maxCombinedTextCharacters - combinedTextCharacters;
        if (remainingCharacters <= 0) {
          omittedTextSources += 1;
          continue;
        }
        const limitedText = sourceText.slice(0, Math.min(maxTextSourceCharacters, remainingCharacters));
        combinedTextCharacters += limitedText.length;
        sourceParts.push({ text: `--- SOURCE FILE: ${file.name} ---\n${limitedText}\n--- END SOURCE FILE: ${file.name} ---` });
        if (limitedText.length < sourceText.length) omittedTextSources += 1;
      } else {
        return NextResponse.json({ error: `${file.name} is not supported. Attach PDF, TXT, MD, or HTML files.` }, { status: 415 });
      }
    }
    if (omittedTextSources > 0) {
      sourceParts.push({ text: `NOTICE: ${omittedTextSources} text source${omittedTextSources === 1 ? " was" : "s were"} truncated or omitted because of the context budget. Do not treat missing portions as evidence.` });
    }
    sourceParts.push({ text: `Create the study guide for this topic: ${topic}\nLevel: ${level}\nFormat: ${format}\nFocus: ${focus}\nGoal: ${goal}\nAvailable study time: ${safePrepMinutes} minutes (${prepAmount} ${prepUnit}).\n\nDesign a realistic study routine that fits this time budget. Include a short phase plan with warm-up, core study, and review blocks when useful. When sources are attached, use only those sources as evidence. Clearly say when the sources do not contain enough information. Do not invent facts or citations. Cover the source comprehensively, including later sections and important details, while keeping the writing concise enough to finish the complete guide.` });
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: sourceParts }],
        generationConfig: { maxOutputTokens: 20000, temperature: 0.2 },
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