const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".tab-panel");
const askBtn = document.getElementById("askBtn");
const assistantInput = document.getElementById("assistantInput");
const assistantResponse = document.getElementById("assistantResponse");
const chatInput = document.getElementById("chatInput");
const chatSendBtn = document.getElementById("chatSendBtn");
const chatFeed = document.getElementById("chatFeed");
const themeToggle = document.getElementById("themeToggle");
const nitrogenInput = document.getElementById("nitrogenInput");
const phosphorusInput = document.getElementById("phosphorusInput");
const potassiumInput = document.getElementById("potassiumInput");
const recommendBtn = document.getElementById("recommendBtn");
const cropResults = document.getElementById("cropResults");
const npkHint = document.getElementById("npkHint");
const micButtons = document.querySelectorAll(".mic-btn");
const API_BASE_URL = "http://localhost:4000/api";
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

  if ([n, p, k].some((value) => Number.isNaN(value))) {
    npkHint.textContent = "Please enter all N, P and K values.";
    return;
  }

  npkHint.textContent = `Fetching recommendations for N:${n}, P:${p}, K:${k}...`;

  try {
    const response = await fetch(`${API_BASE_URL}/recommend-crops`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ n, p, k }),
    });
    const data = await parseApiResponse(response);
    if (!response.ok) {
      throw new Error(data.error || "Recommendation API failed.");
    }

    npkHint.textContent = `Recommended for N:${n}, P:${p}, K:${k}`;
    cropResults.innerHTML = data.recommendations
      .map(
        (crop) => `
      <div class="list-item">
        <div>
          <h4>${escapeHtml(crop.crop)}</h4>
          <p>${escapeHtml(crop.reason)}</p>
        </div>
        <strong>${crop.confidence}%</strong>
      </div>
    `
      )
      .join("");
  } catch (error) {
    npkHint.textContent = error.message;
  }
});

askBtn.addEventListener("click", async () => {
  const query = assistantInput.value.trim();
  if (!query) return;

  assistantResponse.innerHTML = `
    <h4>Chintak is thinking...</h4>
    <p><strong>Your question:</strong> ${escapeHtml(query)}</p>
  `;

  try {
    const location = "Ahmednagar, Maharashtra";
    const npk = {
      n: Number(nitrogenInput.value || 0),
      p: Number(phosphorusInput.value || 0),
      k: Number(potassiumInput.value || 0),
    };
    const reply = await askAssistant(query, location, npk);
    assistantResponse.innerHTML = `
      <h4>Chintak response</h4>
      <p><strong>Your question:</strong> ${escapeHtml(query)}</p>
      <p>${escapeHtml(reply)}</p>
    `;
    assistantInput.value = "";
  } catch (error) {
    assistantResponse.innerHTML = `
      <h4>Gemini error</h4>
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
      <h4>Image required</h4>
      <p>Please upload a leaf or fruit image first.</p>
    `;
    return;
  }

  diseaseResponse.innerHTML = `
    <h4>Analyzing image...</h4>
    <p>Checking for visible crop disease symptoms.</p>
  `;

  try {
    const imagePayload = await fileToBase64Payload(file);
    const response = await fetch(`${API_BASE_URL}/disease-detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partType: diseasePartSelect.value,
        image: imagePayload,
      }),
    });

    const data = await parseApiResponse(response);
    if (!response.ok) {
      throw new Error(data.error || "Disease detection failed.");
    }

    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    const candidatesHtml = candidates
      .slice(0, 3)
      .map(
        (item) =>
          `<li>${escapeHtml(item.name || "Unknown")} (${escapeHtml(item.confidence || "N/A")})</li>`
      )
      .join("");

    diseaseResponse.innerHTML = `
      <h4>Detected: ${escapeHtml(data.disease || "Unknown")}</h4>
      <p><strong>Confidence:</strong> ${escapeHtml(data.confidence || "N/A")}</p>
      <p><strong>Explanation:</strong> ${escapeHtml(data.explanation || "No details")}</p>
      <p><strong>Advice:</strong> ${escapeHtml(data.recommendation || "No recommendation")}</p>
      ${
        candidatesHtml
          ? `<p><strong>Other likely diseases:</strong></p><ul>${candidatesHtml}</ul>`
          : ""
      }
      ${
        data.imageQualityWarning
          ? `<p><strong>Image quality:</strong> ${escapeHtml(data.imageQualityWarning)}</p>`
          : ""
      }
    `;
  } catch (error) {
    diseaseResponse.innerHTML = `
      <h4>Disease detection error</h4>
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

async function askAssistant(query, location, npk) {
  const response = await fetch(`${API_BASE_URL}/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, location, npk }),
  });

  const data = await parseApiResponse(response);
  if (!response.ok) {
    throw new Error(data.error || "Assistant API failed.");
  }
  const text = data?.answer;
  if (!text) {
    throw new Error("No response text returned from assistant.");
  }
  return text;
}

async function loadCommunityMessages() {
  try {
    const response = await fetch(`${API_BASE_URL}/community/messages`);
    const data = await parseApiResponse(response);
    if (!response.ok) {
      throw new Error(data.error || "Failed to load messages.");
    }

    renderCommunityMessages(data.messages || []);
  } catch (error) {
    console.error(error);
  }
}

async function sendCommunityMessage(message) {
  try {
    const response = await fetch(`${API_BASE_URL}/community/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author: "You", message }),
    });
    const data = await parseApiResponse(response);
    if (!response.ok) {
      throw new Error(data.error || "Failed to send message.");
    }

    chatInput.value = "";
    loadCommunityMessages();
  } catch (error) {
    alert(error.message);
  }
}

function renderCommunityMessages(messages) {
  if (!Array.isArray(messages)) return;
  chatFeed.innerHTML = messages
    .map(
      (item) => `
      <div class="post">
        <strong>${escapeHtml(item.author)}</strong>
        <p>${escapeHtml(item.message)}</p>
      </div>
    `
    )
    .join("");
  chatFeed.scrollTop = chatFeed.scrollHeight;
}

async function startVoiceInput(targetId) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Voice input is not supported in this browser.");
    return;
  }

  const isLocalhost =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (!window.isSecureContext && !isLocalhost) {
    alert("Mic needs HTTPS or localhost. Open app using a local server URL.");
    return;
  }

  const target = document.getElementById(targetId);
  if (!target) return;

  const micReady = await ensureMicPermission();
  if (!micReady) return;

  const recognition = new SpeechRecognition();
  recognition.lang = target.type === "number" ? "en-IN" : "en-IN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim();

    if (target.type === "number") {
      const parsed = transcript.match(/\d+/);
      if (parsed) {
        target.value = parsed[0];
      }
      return;
    }

    target.value = transcript;
  };

  recognition.onerror = (event) => {
    if (event.error === "not-allowed") {
      alert("Mic permission denied. Please allow microphone access in browser settings.");
      return;
    }
    alert("Could not capture voice input. Please try again.");
  };
  try {
    recognition.start();
  } catch {
    alert("Mic is busy/unavailable. Wait a moment and try again.");
  }
}

async function ensureMicPermission() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return true;
  }
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
  div.innerText = value;
  return div.innerHTML;
}

function fileToBase64Payload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const commaIndex = result.indexOf(",");
      if (commaIndex === -1) {
        reject(new Error("Invalid image format."));
        return;
      }

      const prefix = result.slice(0, commaIndex);
      const data = result.slice(commaIndex + 1);
      const mimeMatch = prefix.match(/data:(.*);base64/);
      if (!mimeMatch) {
        reject(new Error("Could not detect image MIME type."));
        return;
      }

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
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
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
    const photoFile = new File([blob], `disease-capture-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    handleDiseaseFileSelected(photoFile);
    stopDeviceCamera();
  }, "image/jpeg", 0.92);
}

async function parseApiResponse(response) {
  const raw = await response.text();
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw);
    } catch {
      return { error: "Invalid JSON response from server." };
    }
  }

  return {
    error: `Server returned non-JSON response (${response.status}). ${raw.slice(0, 120)}`,
  };
}
