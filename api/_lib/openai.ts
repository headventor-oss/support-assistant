import OpenAI from "openai";

let client: OpenAI | undefined;

export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
