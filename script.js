const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".tab-panel");
const askBtn = document.getElementById("askBtn");
const assistantInput = document.getElementById("assistantInput");
const assistantResponse = document.getElementById("assistantResponse");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");
const chatFeed = document.getElementById("chatFeed");
const themeToggle = document.getElementById("themeToggle");
const langSelect = document.getElementById("langSelect");
const nitrogenInput = document.getElementById("nitrogenInput");
const phosphorusInput = document.getElementById("phosphorusInput");
const potassiumInput = document.getElementById("potassiumInput");
const recommendBtn = document.getElementById("recommendBtn");
const cropResults = document.getElementById("cropResults");
const npkHint = document.getElementById("npkHint");
const micButtons = document.querySelectorAll(".mic-btn");
const API_BASE_URL = "/api";
const diseasePartSelect = document.getElementById("diseasePartSelect");
const diseaseImageInput = document.getElementById("diseaseImageInput");
const diseaseCameraInput = document.getElementById("diseaseCameraInput");
const cameraCaptureBtn = document.getElementById("cameraCaptureBtn");
const cameraBox = document.getElementById("cameraBox");
const cameraVideo = document.getElementById("cameraVideo");
const takePhotoBtn = document.getElementById("takePhotoBtn");
const closeCameraBtn = document.getElementById("closeCameraBtn");
const diseasePreview = document.getElementById("diseasePreview");
const detectDiseaseBtn = document.getElementById("detectDiseaseBtn");
const diseaseResponse = document.getElementById("diseaseResponse");
let activeCameraStream = null;
let selectedDiseaseFile = null;

function currentLang() {
  return langSelect ? langSelect.value : "en-IN";
}

function t(key) {
  const lang = currentLang();
  const dict = (typeof TRANSLATIONS !== "undefined" && TRANSLATIONS[lang]) || TRANSLATIONS["en-IN"] || {};
  return dict[key] || key;
}

(function checkAuth() {
  const session = JSON.parse(localStorage.getItem("krishi_session") || "null");
  if (!session) {
    window.location.href = "/login.html";
    return;
  }
  const logoutBtn = document.getElementById("logoutBtn");
  const adminLink = document.getElementById("adminLink");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("krishi_session");
      window.location.href = "/login.html";
    });
  }
  if (adminLink) {
    if (session.role === "admin") {
      adminLink.classList.remove("hidden");
    } else {
      adminLink.classList.add("hidden");
    }
  }
})();

applyTranslations(currentLang());

if (langSelect) {
  langSelect.addEventListener("change", () => {
    applyTranslations(langSelect.value);
  });
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;
    tabs.forEach((item) => item.classList.remove("active"));
    panels.forEach((panel) => panel.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(target).classList.add("active");
  });
});

loadCommunityMessages();

diseaseImageInput.addEventListener("change", () => handleDiseaseFileSelected(diseaseImageInput.files?.[0]));
diseaseCameraInput.addEventListener("change", () => handleDiseaseFileSelected(diseaseCameraInput.files?.[0]));
cameraCaptureBtn.addEventListener("click", openDeviceCamera);
takePhotoBtn.addEventListener("click", capturePhotoFromVideo);
closeCameraBtn.addEventListener("click", stopDeviceCamera);

recommendBtn.addEventListener("click", async () => {
  const n = Number(nitrogenInput.value);
  const p = Number(phosphorusInput.value);
  const k = Number(potassiumInput.value);

  if ([n, p, k].some((v) => Number.isNaN(v) || nitrogenInput.value === "" || phosphorusInput.value === "" || potassiumInput.value === "")) {
    npkHint.textContent = t("invalidNpk");
    return;
  }

  npkHint.textContent = t("loadingCrops");

  try {
    const lang = currentLang();
    const response = await fetch(`${API_BASE_URL}/recommend-crops`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ n, p, k, language: lang }),
    });
    const data = await parseApiResponse(response);
    if (!response.ok) throw new Error(data.error || "Recommendation API failed.");

    npkHint.textContent = `N:${n}  P:${p}  K:${k}`;
    cropResults.innerHTML = data.recommendations
      .map((crop) => {
        const localCropName = (typeof translateCropName !== "undefined")
          ? translateCropName(crop.crop, lang)
          : crop.crop;
        return `
          <div class="list-item">
            <div>
              <h4>${escapeHtml(localCropName)}</h4>
              <p>${escapeHtml(crop.reason)}</p>
            </div>
            <strong>${crop.confidence}%</strong>
          </div>`;
      })
      .join("");
  } catch (error) {
    npkHint.textContent = error.message;
  }
});

askBtn.addEventListener("click", async () => {
  const query = assistantInput.value.trim();
  if (!query) return;

  const lang = currentLang();
  assistantResponse.innerHTML = `
    <h4>${escapeHtml(t("thinkingMsg"))}</h4>
    <p><strong>${escapeHtml(t("yourQuestion"))}:</strong> ${escapeHtml(query)}</p>
  `;

  try {
    const location = "Ahmednagar, Maharashtra";
    const npk = {
      n: Number(nitrogenInput.value || 0),
      p: Number(phosphorusInput.value || 0),
      k: Number(potassiumInput.value || 0),
    };
    const reply = await askAssistant(query, location, npk, lang);

    const lines = reply.split("\n").filter((l) => l.trim() !== "");
    const formatted = lines.map((line) => {
      const escaped = escapeHtml(line);
      if (/^\s*[-*•]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
        return `<p style="margin:0.3rem 0 0.3rem 0.8rem">${escaped}</p>`;
      }
      return `<p>${escaped}</p>`;
    }).join("");

    assistantResponse.innerHTML = `
      <h4>${escapeHtml(t("chintakResponse"))}</h4>
      <p style="color:var(--muted);font-size:0.85rem"><strong>${escapeHtml(t("yourQuestion"))}:</strong> ${escapeHtml(query)}</p>
      <div style="margin-top:0.6rem">${formatted}</div>
    `;
    assistantInput.value = "";
  } catch (error) {
    assistantResponse.innerHTML = `
      <h4>${escapeHtml(t("geminiError"))}</h4>
      <p>${escapeHtml(error.message)}</p>
    `;
  }
});

chatSendBtn.addEventListener("click", () => {
  const message = chatInput.value.trim();
  if (!message) return;
  sendCommunityMessage(message);
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
});

detectDiseaseBtn.addEventListener("click", async () => {
  const file = selectedDiseaseFile || diseaseImageInput.files?.[0] || diseaseCameraInput.files?.[0];
  if (!file) {
    diseaseResponse.innerHTML = `
      <h4>${escapeHtml(t("imageRequired"))}</h4>
      <p>${escapeHtml(t("pleaseUpload"))}</p>
    `;
    return;
  }

  const lang = currentLang();
  diseaseResponse.innerHTML = `
    <h4>${escapeHtml(t("analyzingImage"))}</h4>
    <p>${escapeHtml(t("checkingSymptoms"))}</p>
  `;

  try {
    const imagePayload = await fileToBase64Payload(file);
    const response = await fetch(`${API_BASE_URL}/disease-detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partType: diseasePartSelect.value,
        image: imagePayload,
        language: lang,
      }),
    });

    const data = await parseApiResponse(response);
    if (!response.ok) throw new Error(data.error || "Disease detection failed.");

    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    const candidatesHtml = candidates
      .slice(0, 3)
      .map((item) => `<li>${escapeHtml(item.name || "Unknown")} (${escapeHtml(item.confidence || "N/A")})</li>`)
      .join("");

    diseaseResponse.innerHTML = `
      <h4>${escapeHtml(t("detectedLabel"))}: ${escapeHtml(data.disease || "Unknown")}</h4>
      <p><strong>${escapeHtml(t("confidenceLabel"))}:</strong> ${escapeHtml(data.confidence || "N/A")}</p>
      <p><strong>${escapeHtml(t("explanationLabel"))}:</strong> ${escapeHtml(data.explanation || "No details")}</p>
      <p><strong>${escapeHtml(t("adviceLabel"))}:</strong> ${escapeHtml(data.recommendation || "No recommendation")}</p>
      ${candidatesHtml ? `<p><strong>${escapeHtml(t("otherDiseases"))}:</strong></p><ul>${candidatesHtml}</ul>` : ""}
      ${data.imageQualityWarning ? `<p><strong>${escapeHtml(t("imageQualityLabel"))}:</strong> ${escapeHtml(data.imageQualityWarning)}</p>` : ""}
    `;
  } catch (error) {
    diseaseResponse.innerHTML = `
      <h4>${escapeHtml(t("detectionError"))}</h4>
      <p>${escapeHtml(error.message)}</p>
    `;
  }
});

micButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.dataset.voiceTarget;
    startVoiceInput(targetId);
  });
});

async function askAssistant(query, location, npk, language) {
  const response = await fetch(`${API_BASE_URL}/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, location, npk, language }),
  });
  const data = await parseApiResponse(response);
  if (!response.ok) throw new Error(data.error || "Assistant API failed.");
  const text = data?.answer;
  if (!text) throw new Error("No response text returned from assistant.");
  return text;
}

async function loadCommunityMessages() {
  try {
    const response = await fetch(`${API_BASE_URL}/community/messages`);
    const data = await parseApiResponse(response);
    if (!response.ok) throw new Error(data.error || "Failed to load messages.");
    renderCommunityMessages(data.messages || []);
  } catch (error) {
    console.error(error);
  }
}

async function sendCommunityMessage(message) {
  try {
    const session = JSON.parse(localStorage.getItem("krishi_session") || "null");
    const author = session ? session.displayName : "Farmer";
    const response = await fetch(`${API_BASE_URL}/community/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author, message }),
    });
    const data = await parseApiResponse(response);
    if (!response.ok) throw new Error(data.error || "Failed to send message.");
    chatInput.value = "";
    loadCommunityMessages();
  } catch (error) {
    alert(error.message);
  }
}

function renderCommunityMessages(messages) {
  if (!Array.isArray(messages)) return;
  chatFeed.innerHTML = messages
    .map((item) => `
      <div class="post">
        <strong>${escapeHtml(item.author)}</strong>
        <p>${escapeHtml(item.message)}</p>
      </div>`)
    .join("");
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

async function startVoiceInput(targetId) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Voice input is not supported in this browser.");
    return;
  }
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (!window.isSecureContext && !isLocalhost) {
    alert("Mic needs HTTPS or localhost.");
    return;
  }
  const target = document.getElementById(targetId);
  if (!target) return;
  const micReady = await ensureMicPermission();
  if (!micReady) return;

  const recognition = new SpeechRecognition();
  recognition.lang = currentLang();
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim();
    if (target.type === "number") {
      const parsed = transcript.match(/\d+/);
      if (parsed) target.value = parsed[0];
      return;
    }
    target.value = transcript;
  };

  recognition.onerror = (event) => {
    if (event.error === "not-allowed") {
      alert("Mic permission denied. Open the app in a new tab and allow microphone access.");
      return;
    }
    if (event.error === "no-speech") {
      alert("No speech detected. Please speak clearly and try again.");
      return;
    }
    alert("Voice input error: " + event.error);
  };
  try {
    recognition.start();
  } catch {
    alert("Mic is busy/unavailable. Wait a moment and try again.");
  }
}

async function ensureMicPermission() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    alert("Microphone permission is blocked. Please allow mic access and retry.");
    return false;
  }
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.innerText = String(value ?? "");
  return div.innerHTML;
}

function fileToBase64Payload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const commaIndex = result.indexOf(",");
      if (commaIndex === -1) { reject(new Error("Invalid image format.")); return; }
      const prefix = result.slice(0, commaIndex);
      const data = result.slice(commaIndex + 1);
      const mimeMatch = prefix.match(/data:(.*);base64/);
      if (!mimeMatch) { reject(new Error("Could not detect image MIME type.")); return; }
      resolve({ mimeType: mimeMatch[1], data });
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function handleDiseaseFileSelected(file) {
  if (!file) {
    diseasePreview.classList.add("hidden");
    diseasePreview.removeAttribute("src");
    selectedDiseaseFile = null;
    return;
  }
  selectedDiseaseFile = file;
  const previewUrl = URL.createObjectURL(file);
  diseasePreview.src = previewUrl;
  diseasePreview.classList.remove("hidden");
}

async function openDeviceCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    diseaseCameraInput.click();
    return;
  }
  try {
    stopDeviceCamera();
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
    activeCameraStream = stream;
    cameraVideo.srcObject = stream;
    cameraBox.classList.remove("hidden");
  } catch {
    diseaseCameraInput.click();
  }
}

function stopDeviceCamera() {
  if (activeCameraStream) {
    activeCameraStream.getTracks().forEach((track) => track.stop());
    activeCameraStream = null;
  }
  cameraVideo.srcObject = null;
  cameraBox.classList.add("hidden");
}

function capturePhotoFromVideo() {
  if (!cameraVideo.videoWidth || !cameraVideo.videoHeight) return;
  const canvas = document.createElement("canvas");
  canvas.width = cameraVideo.videoWidth;
  canvas.height = cameraVideo.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const photoFile = new File([blob], `disease-capture-${Date.now()}.jpg`, { type: "image/jpeg" });
    handleDiseaseFileSelected(photoFile);
    stopDeviceCamera();
  }, "image/jpeg", 0.92);
}

async function parseApiResponse(response) {
  const raw = await response.text();
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try { return JSON.parse(raw); }
    catch { return { error: "Invalid JSON response from server." }; }
  }
  return { error: `Server returned non-JSON response (${response.status}). ${raw.slice(0, 120)}` };
}
