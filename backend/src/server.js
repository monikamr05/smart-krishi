const path = require("path");
// Support loading .env from root, backend/, and current directory
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { predictCrops } = require("./cropModel");

const app = express();
const router = express.Router();

const PORT = process.env.PORT || 4000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

const communityMessages = [
  { id: 1, author: "Ravi, Nashik", message: "Anyone using drip irrigation for summer onion?" },
  { id: 2, author: "Meena, Satara", message: "Best natural spray for whiteflies in cotton crop?" },
];

app.use(cors());
app.use(express.json({ limit: "15mb" }));

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "smart-agri-backend",
    providers: {
      gemini: Boolean(GEMINI_API_KEY),
      openrouter: Boolean(OPENROUTER_API_KEY),
    },
  });
});

router.post("/recommend-crops", (req, res) => {
  const { n, p, k } = req.body || {};
  const parsed = [Number(n), Number(p), Number(k)];

  if (parsed.some((value) => Number.isNaN(value) || value < 0)) {
    return res.status(400).json({ error: "Please provide valid N, P, K values (>= 0)." });
  }

  const [nitrogen, phosphorus, potassium] = parsed;
  const recommendations = predictCrops(nitrogen, phosphorus, potassium, 3);

  return res.json({
    input: { n: nitrogen, p: phosphorus, k: potassium },
    recommendations,
  });
});

router.post("/assistant", async (req, res) => {
  const { query, location, npk } = req.body || {};
  if (!query || !String(query).trim()) {
    return res.status(400).json({ error: "Query is required." });
  }

  const apiKeyGemini = process.env.GEMINI_API_KEY || GEMINI_API_KEY;
  const apiKeyOpenRouter = process.env.OPENROUTER_API_KEY || OPENROUTER_API_KEY;

  if (!apiKeyGemini && !apiKeyOpenRouter) {
    return res.status(500).json({
      error: "AI API Key is not configured. Please set GEMINI_API_KEY or OPENROUTER_API_KEY in your .env file or Vercel environment variables.",
    });
  }

  const prompt = [
    "You are Chintak, an agriculture advisor for Indian small and marginal farmers.",
    "Always provide your answer in clear, simple English unless the user explicitly asks in another language (e.g. Hindi, Marathi).",
    "Give practical and concise answers in simple language.",
    "Do not start with greetings like Namaste/Hello.",
    "Do not introduce yourself unless asked.",
    "If relevant, include irrigation, fertilizer, pest control and risk mitigation guidance.",
    "Answer ONLY the current farmer question. Do not repeat old answers unless needed.",
    location ? `Farmer location: ${location}.` : "",
    npk ? `Soil values (NPK): N=${npk.n}, P=${npk.p}, K=${npk.k}.` : "",
    `Request tag: ${requestTag}`,
    `Farmer question: ${query}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    let answer = "";
    let lastError = "";

    // 1. Try OpenRouter if configured
    if (apiKeyOpenRouter) {
      try {
        answer = await callOpenRouterText(prompt, apiKeyOpenRouter);
      } catch (err) {
        lastError = `OpenRouter error: ${err.message}`;
        console.error(lastError);
      }
    }

    // 2. Fallback to Gemini if OpenRouter didn't return answer and Gemini key exists
    if (!answer && apiKeyGemini) {
      const modelCandidates = [process.env.GEMINI_MODEL || GEMINI_MODEL, "gemini-2.0-flash", "gemini-2.0-flash-lite"];
      const resGemini = await generateWithGeminiFallback([{ text: prompt }], modelCandidates, apiKeyGemini);
      answer = resGemini.answer;
      if (!answer) lastError = resGemini.lastError || lastError;
    }

    if (!answer) {
      return res.status(502).json({
        error: `AI returned empty response.${lastError ? ` Details: ${lastError}` : ""}`,
      });
    }

    return res.json({ answer: cleanAssistantAnswer(answer) });
  } catch (error) {
    return res.status(500).json({ error: `Assistant service failed: ${error.message}` });
  }
});

router.post("/disease-detect", async (req, res) => {
  const { partType, image } = req.body || {};
  if (!image || !image.data || !image.mimeType) {
    return res.status(400).json({ error: "Image payload is required." });
  }

  const apiKeyGemini = process.env.GEMINI_API_KEY || GEMINI_API_KEY;
  const apiKeyOpenRouter = process.env.OPENROUTER_API_KEY || OPENROUTER_API_KEY;

  if (!apiKeyGemini && !apiKeyOpenRouter) {
    return res.status(500).json({
      error: "AI API Key is not configured. Please set GEMINI_API_KEY or OPENROUTER_API_KEY in your .env file or Vercel environment variables.",
    });
  }

  const typeLabel = partType === "fruit" ? "fruit" : "leaf";
  const textPrompt = [
    "You are an expert plant pathologist.",
    `Analyze this crop ${typeLabel} image and identify the most likely disease.`,
    "Use visible symptoms from the image first, then infer likely disease.",
    "If the image is not a plant/crop part, set disease as 'Not a crop image'.",
    "Return strict JSON with keys: disease, confidence, explanation, recommendation, isCropImage, imageQualityWarning, candidates.",
    "confidence should be one of: Low, Medium, High.",
    "candidates should be an array of up to 3 objects with keys: name, confidence.",
    "If disease is unclear, set disease to 'Uncertain' and give safe next steps.",
  ].join("\n");

  try {
    let answer = "";
    let lastError = "";

    // 1. Try OpenRouter Vision if configured
    if (apiKeyOpenRouter) {
      try {
        answer = await callOpenRouterVision(textPrompt, image, apiKeyOpenRouter);
      } catch (err) {
        lastError = `OpenRouter Vision error: ${err.message}`;
        console.error(lastError);
      }
    }

    // 2. Fallback to Gemini Vision if needed
    if (!answer && apiKeyGemini) {
      const modelCandidates = [process.env.GEMINI_MODEL || GEMINI_MODEL, "gemini-2.0-flash", "gemini-2.0-flash-lite"];
      const parts = [
        { text: textPrompt },
        {
          inlineData: {
            mimeType: image.mimeType,
            data: image.data,
          },
        },
      ];
      const resGemini = await generateWithGeminiFallback(parts, modelCandidates, apiKeyGemini);
      answer = resGemini.answer;
      if (!answer) lastError = resGemini.lastError || lastError;
    }

    if (!answer) {
      return res.status(502).json({
        error: `Disease detection empty response.${lastError ? ` Details: ${lastError}` : ""}`,
      });
    }

    const parsed = parseDiseaseAnswer(answer);
    return res.json({
      disease: sanitizeDiseaseText(parsed.disease) || "Uncertain",
      confidence: sanitizeDiseaseText(parsed.confidence) || "Low",
      explanation: sanitizeDiseaseText(parsed.explanation) || "Unable to reliably detect from image.",
      recommendation: sanitizeDiseaseText(parsed.recommendation) || "Consult local agriculture officer and provide clearer image.",
      isCropImage: parsed.isCropImage ?? true,
      imageQualityWarning: sanitizeDiseaseText(parsed.imageQualityWarning) || "",
      candidates: normalizeCandidates(parsed.candidates),
      raw: answer,
    });
  } catch (error) {
    return res.status(500).json({ error: `Disease detection failed: ${error.message}` });
  }
});

router.get("/community/messages", (_req, res) => {
  res.json({ messages: communityMessages });
});

router.post("/community/messages", (req, res) => {
  const { author, message } = req.body || {};
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: "Message is required." });
  }

  const newMessage = {
    id: communityMessages.length + 1,
    author: author && String(author).trim() ? String(author).trim() : "You",
    message: String(message).trim(),
  };
  communityMessages.push(newMessage);
  res.status(201).json({ message: newMessage });
});

/* ---------------- OPENROUTER HANDLERS ---------------- */

async function callOpenRouterText(prompt, apiKey) {
  const model = process.env.OPENROUTER_MODEL || OPENROUTER_MODEL || "google/gemini-2.5-flash";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://smart-krishi.vercel.app",
      "X-Title": "Smart Krishi Advisor",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`OpenRouter HTTP ${response.status}: ${raw}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

async function callOpenRouterVision(textPrompt, image, apiKey) {
  const model = process.env.OPENROUTER_MODEL || OPENROUTER_MODEL || "google/gemini-2.5-flash";
  const imageUrl = `data:${image.mimeType};base64,${image.data}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://smart-krishi.vercel.app",
      "X-Title": "Smart Krishi Advisor",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: textPrompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 512,
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`OpenRouter Vision HTTP ${response.status}: ${raw}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

/* ---------------- GEMINI HANDLERS ---------------- */

async function generateWithGeminiFallback(parts, modelCandidates, apiKey) {
  let lastError = "";
  const tried = new Set();

  for (const candidate of modelCandidates) {
    if (!candidate || tried.has(candidate)) continue;
    tried.add(candidate);
    const result = await tryGenerateGeminiContent(candidate, parts, apiKey);
    if (result.answer) return { answer: result.answer, lastError: "" };
    lastError = result.error || lastError;
  }

  const discoveredModels = await fetchGeminiSupportedModels(apiKey);
  for (const model of discoveredModels) {
    if (tried.has(model)) continue;
    const result = await tryGenerateGeminiContent(model, parts, apiKey);
    if (result.answer) return { answer: result.answer, lastError: "" };
    lastError = result.error || lastError;
  }

  return { answer: "", lastError };
}

async function tryGenerateGeminiContent(model, parts, apiKey) {
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          topK: 32,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!response.ok) {
      const raw = await response.text();
      return { answer: "", error: `Model ${model} failed: ${raw}` };
    }

    const data = await response.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return { answer, error: "" };
  } catch (error) {
    return { answer: "", error: `Model ${model} request error: ${error.message}` };
  }
}

async function fetchGeminiSupportedModels(apiKey) {
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
      apiKey
    )}`;
    const response = await fetch(endpoint);
    if (!response.ok) return [];
    const data = await response.json();
    const models = (data?.models || [])
      .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
      .map((m) => String(m.name || "").replace("models/", ""))
      .filter(Boolean);
    return models;
  } catch {
    return [];
  }
}

function cleanAssistantAnswer(answer) {
  const text = String(answer || "").trim();
  const lines = text.split("\n");
  const cleaned = lines.filter((line, idx) => {
    const trimmed = line.trim();
    if (/^\s*(request tag:|req-\d+)/i.test(trimmed)) return false;
    if (idx > 3) return true;
    return !/^\s*(namaste|hello|hi|main chintak|i am chintak)/i.test(trimmed);
  });
  return cleaned.join("\n").trim() || text;
}

function parseDiseaseAnswer(text) {
  const parsed = parseJsonAnswer(text);
  if (Object.keys(parsed).length > 0) return parsed;

  const clean = String(text || "").trim();
  const firstSentence = clean.split(/\n|\./).map((s) => s.trim()).filter(Boolean)[0] || "";
  return {
    disease: firstSentence.slice(0, 80) || "Uncertain",
    confidence: /high confidence|very likely/i.test(clean)
      ? "High"
      : /likely|moderate/i.test(clean)
      ? "Medium"
      : "Low",
    explanation: clean || "Unable to reliably detect from image.",
    recommendation: "Upload a close, well-lit image focused on the affected area.",
  };
}

function sanitizeDiseaseText(value) {
  return String(value || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .replace(/^[\s"'`{}[\]:,.-]+|[\s"'`{}[\]:,.-]+$/g, "")
    .trim();
}

function normalizeCandidates(candidates) {
  if (!Array.isArray(candidates)) return [];
  return candidates
    .map((item) => ({
      name: sanitizeDiseaseText(item?.name),
      confidence: sanitizeDiseaseText(item?.confidence),
    }))
    .filter((item) => item.name)
    .slice(0, 3);
}

function parseJsonAnswer(text) {
  try {
    const source = String(text || "").trim();
    const deFenced = source
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();
    try {
      return JSON.parse(deFenced);
    } catch {
      const start = deFenced.indexOf("{");
      const end = deFenced.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        const maybeJson = deFenced.slice(start, end + 1);
        return JSON.parse(maybeJson);
      }
    }
    return {};
  } catch {
    return {};
  }
}

app.use("/api", router);
app.use("/", router);

app.use((err, _req, res, _next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Uploaded image is too large. Please use a smaller image." });
  }
  return res.status(500).json({ error: err?.message || "Unexpected server error." });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;
