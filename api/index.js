const path = require("path");
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

let farmersDatabase = [
  {
    id: "FARM-101",
    name: "Ramesh Patil",
    contact: "9822012345",
    location: "Ahmednagar, Maharashtra",
    landArea: "4.5 Acres",
    crops: ["Wheat", "Soybean", "Onion"],
    soilNPK: { n: 62, p: 38, k: 47 },
    status: "Active",
    registeredDate: "2026-01-12",
    inquiriesCount: 14,
  },
  {
    id: "FARM-102",
    name: "Suresh Deshmukh",
    contact: "9890123456",
    location: "Nashik, Maharashtra",
    landArea: "6.0 Acres",
    crops: ["Grapes", "Tomato", "Pigeon Pea"],
    soilNPK: { n: 75, p: 42, k: 50 },
    status: "Active",
    registeredDate: "2026-01-20",
    inquiriesCount: 8,
  },
  {
    id: "FARM-103",
    name: "Sunita Pawar",
    contact: "9765432109",
    location: "Satara, Maharashtra",
    landArea: "2.8 Acres",
    crops: ["Sugarcane", "Ginger", "Maize"],
    soilNPK: { n: 88, p: 40, k: 55 },
    status: "Active",
    registeredDate: "2026-02-05",
    inquiriesCount: 19,
  },
  {
    id: "FARM-104",
    name: "Anand Shinde",
    contact: "9422334455",
    location: "Solapur, Maharashtra",
    landArea: "5.2 Acres",
    crops: ["Pomegranate", "Millet", "Cotton"],
    soilNPK: { n: 50, p: 30, k: 60 },
    status: "Active",
    registeredDate: "2026-02-18",
    inquiriesCount: 5,
  },
  {
    id: "FARM-105",
    name: "Meena Jadhav",
    contact: "9561234567",
    location: "Nagpur, Maharashtra",
    landArea: "3.5 Acres",
    crops: ["Orange", "Cotton", "Soybean"],
    soilNPK: { n: 58, p: 32, k: 48 },
    status: "Active",
    registeredDate: "2026-03-01",
    inquiriesCount: 11,
  },
];

app.use(cors());
app.use(express.json({ limit: "15mb" }));

// Serve static frontend files (index.html, style.css, script.js, assets)
app.use(express.static(path.join(__dirname, "..")));

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "smart-krishi-backend",
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
    "Always write all text, explanations, and recommendations in clear English.",
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

/* ---------------- ADMIN & FARMERS DATABASE ENDPOINTS ---------------- */

router.post("/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  if ((username === "admin" && password === "admin123") || password === "krishi@2026") {
    return res.json({ success: true, token: "admin-session-token-9988", role: "SuperAdmin" });
  }
  return res.status(401).json({ error: "Invalid admin credentials. Use username: admin / password: admin123" });
});

router.get("/admin/stats", (_req, res) => {
  const totalFarmers = farmersDatabase.length;
  const totalInquiries = farmersDatabase.reduce((acc, f) => acc + (f.inquiriesCount || 0), 45);
  const totalAcres = farmersDatabase
    .reduce((acc, f) => acc + (parseFloat(f.landArea) || 0), 0)
    .toFixed(1);
  const regions = [...new Set(farmersDatabase.map((f) => f.location))];

  const cropCounts = {};
  farmersDatabase.forEach((f) => {
    (f.crops || []).forEach((c) => {
      cropCounts[c] = (cropCounts[c] || 0) + 1;
    });
  });

  return res.json({
    totalFarmers,
    totalInquiries,
    totalAcres: `${totalAcres} Acres`,
    regionsCount: regions.length,
    activeDiseasesReported: 6,
    cropDistribution: cropCounts,
  });
});

router.get("/farmers", (req, res) => {
  const { search, crop } = req.query || {};
  let list = [...farmersDatabase];

  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.contact.includes(q) ||
        f.location.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q)
    );
  }

  if (crop) {
    const c = String(crop).toLowerCase();
    list = list.filter((f) => (f.crops || []).some((item) => item.toLowerCase().includes(c)));
  }

  return res.json({ farmers: list });
});

router.post("/farmers", (req, res) => {
  const { name, contact, location, landArea, crops, soilNPK } = req.body || {};
  if (!name || !contact) {
    return res.status(400).json({ error: "Farmer Name and Contact number are required." });
  }

  const newId = `FARM-${100 + farmersDatabase.length + 1}`;
  const newFarmer = {
    id: newId,
    name: String(name).trim(),
    contact: String(contact).trim(),
    location: location ? String(location).trim() : "Maharashtra, India",
    landArea: landArea ? String(landArea).trim() : "3.0 Acres",
    crops: Array.isArray(crops)
      ? crops
      : String(crops || "Mixed")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
    soilNPK: soilNPK || { n: 60, p: 40, k: 40 },
    status: "Active",
    registeredDate: new Date().toISOString().split("T")[0],
    inquiriesCount: 1,
  };

  farmersDatabase.unshift(newFarmer);
  return res.status(201).json({ success: true, farmer: newFarmer });
});

router.put("/farmers/:id", (req, res) => {
  const { id } = req.params;
  const index = farmersDatabase.findIndex((f) => f.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Farmer record not found." });
  }

  const { name, contact, location, landArea, crops, status, soilNPK } = req.body || {};
  const current = farmersDatabase[index];

  farmersDatabase[index] = {
    ...current,
    name: name ? String(name).trim() : current.name,
    contact: contact ? String(contact).trim() : current.contact,
    location: location ? String(location).trim() : current.location,
    landArea: landArea ? String(landArea).trim() : current.landArea,
    crops: crops
      ? Array.isArray(crops)
        ? crops
        : String(crops)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
      : current.crops,
    status: status || current.status,
    soilNPK: soilNPK || current.soilNPK,
  };

  return res.json({ success: true, farmer: farmersDatabase[index] });
});

router.delete("/farmers/:id", (req, res) => {
  const { id } = req.params;
  const initialLength = farmersDatabase.length;
  farmersDatabase = farmersDatabase.filter((f) => f.id !== id);
  if (farmersDatabase.length === initialLength) {
    return res.status(404).json({ error: "Farmer not found." });
  }
  return res.json({ success: true, message: `Farmer ${id} deleted successfully.` });
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

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  const filePath = path.join(__dirname, "..", req.path);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.sendFile(path.join(__dirname, "..", "index.html"));
    }
  });
});

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
