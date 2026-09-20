import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT || 3000);
const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: "32kb" }));
app.use(express.static(__dirname));

const SYSTEM_PROMPT = `You are CONEX, a friendly, accurate AI assistant.\n\nRules:\n- Answer clearly and helpfully.\n- Be concise unless the user asks for detail.\n- Do not claim to have current web access unless it is actually provided.\n- Protect private information and never reveal API keys.\n- If unsure, say so instead of inventing facts.`;

function cleanMessage(value) {
  return typeof value === "string" ? value.trim().slice(0, 12000) : "";
}

function getHistory(body) {
  if (!Array.isArray(body.history)) return [];
  return body.history
    .filter(item => item && (item.role === "user" || item.role === "assistant"))
    .slice(-12)
    .map(item => ({ role: item.role, content: cleanMessage(item.content) }))
    .filter(item => item.content);
}

async function askOpenAI(message, history) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: message }
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 700
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "OpenAI request failed");
  return data.choices?.[0]?.message?.content?.trim() || "OpenAI returned an empty response.";
}

async function askGemini(message, history) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");

  const contents = [
    ...history.map(item => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }]
    })),
    { role: "user", parts: [{ text: message }] }
  ];

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 700 }
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Gemini request failed");
  return data.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim() || "Gemini returned an empty response.";
}

app.post("/api/chat", async (req, res) => {
  const message = cleanMessage(req.body?.message);
  if (!message) return res.status(400).json({ error: "A message is required." });

  try {
    const history = getHistory(req.body);
    const reply = provider === "gemini"
      ? await askGemini(message, history)
      : await askOpenAI(message, history);
    res.json({ reply, provider });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: "AI provider request failed. Check the server configuration." });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, provider });
});

app.listen(port, () => {
  console.log(`CONEX is running at http://localhost:${port} using ${provider}`);
});
