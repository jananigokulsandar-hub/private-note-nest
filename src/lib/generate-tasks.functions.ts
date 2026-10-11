import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { title: string }) => {
    if (!input || typeof input.title !== "string" || !input.title.trim()) {
      throw new Error("A title is required to generate tasks.");
    }
    return { title: input.title.trim().slice(0, 200) };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) {
      throw new Error("AI generation is not configured yet.");
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const interaction = await ai.interactions.create({
      model: "models/gemini-3.8-flash",
      input: `You are a helpful planning assistant. The user gives you a note title and you produce a practical to-do list or step-by-step plan for it.

Rules:
- Output plain text only, no markdown headings or bold.
- One task or step per line, each starting with "- ".
- 6 to 12 items, concise and actionable.
- No introduction, no closing remarks — only the list.

Title: ${data.title}`,
      generation_config: {
        max_output_tokens: 65536,
        thinkingLevel: "medium",
      },
    });

    const text = interaction.output_text?.trim();
    if (!text) {
      throw new Error("The AI did not return any tasks. Please try again.");
    }
    return { body: text };
  });
