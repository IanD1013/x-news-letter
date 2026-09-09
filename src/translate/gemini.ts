import { z } from "zod";
import { SYSTEM_PROMPT } from "./prompt.ts";

export type TranslateInput = { id: string; text: string };

const Output = z.object({
  translations: z.array(z.object({ id: z.string(), zh: z.string() })),
});

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    translations: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "string" }, zh: { type: "string" } },
        required: ["id", "zh"],
      },
    },
  },
  required: ["translations"],
};

/** One Gemini call for a batch. Ids missing from the result were skipped by the model. */
export async function translateBatch(
  apiKey: string,
  model: string,
  items: TranslateInput[],
): Promise<Map<string, string>> {
  // Only readers who turn translation on need the SDK, so keep it out of the main bundle.
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });
  const interaction = await ai.interactions.create({
    model,
    system_instruction: SYSTEM_PROMPT,
    input: JSON.stringify({ items }),
    response_format: { type: "text", mime_type: "application/json", schema: RESPONSE_SCHEMA },
  });
  const text = interaction.output_text;
  if (!text) throw new Error("模型没有返回内容");
  const parsed = Output.parse(JSON.parse(text));
  return new Map(parsed.translations.map((t) => [t.id, t.zh]));
}
