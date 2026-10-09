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
const API_BASE_URL = window.location.protocol === "file:" ? "http://localhost:4000/api" : "/api";
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
const detectedLocation = document.getElementById("detectedLocation");

// Auth Elements
const authModal = document.getElementById("authModal");
const openAuthBtn = document.getElementById("openAuthBtn");
const closeAuthBtn = document.getElementById("closeAuthBtn");
const tabLoginBtn = document.getElementById("tabLoginBtn");
const tabRegisterBtn = document.getElementById("tabRegisterBtn");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginContact = document.getElementById("loginContact");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");
const regName = document.getElementById("regName");
const regContact = document.getElementById("regContact");
const regLocation = document.getElementById("regLocation");
const regCrops = document.getElementById("regCrops");
const regPassword = document.getElementById("regPassword");
const regError = document.getElementById("regError");
const guestLoginBtn = document.getElementById("guestLoginBtn");
const userProfileBadge = document.getElementById("userProfileBadge");
const userNameDisplay = document.getElementById("userNameDisplay");
const logoutBtn = document.getElementById("logoutBtn");

// Admin Elements
const adminGateCard = document.getElementById("adminGateCard");
const adminDashboardView = document.getElementById("adminDashboardView");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminUsername = document.getElementById("adminUsername");
const adminPassword = document.getElementById("adminPassword");
const adminLoginError = document.getElementById("adminLoginError");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");
const statTotalFarmers = document.getElementById("statTotalFarmers");
const statTotalAcres = document.getElementById("statTotalAcres");
const statTotalInquiries = document.getElementById("statTotalInquiries");
const statRegionsCount = document.getElementById("statRegionsCount");
const farmerSearchInput = document.getElementById("farmerSearchInput");
const farmerCropFilter = document.getElementById("farmerCropFilter");
const farmersTableBody = document.getElementById("farmersTableBody");
const openAddFarmerBtn = document.getElementById("openAddFarmerBtn");
const exportFarmersBtn = document.getElementById("exportFarmersBtn");
const addFarmerModal = document.getElementById("addFarmerModal");
const closeAddFarmerBtn = document.getElementById("closeAddFarmerBtn");
const addFarmerForm = document.getElementById("addFarmerForm");
const newFarmerName = document.getElementById("newFarmerName");
const newFarmerContact = document.getElementById("newFarmerContact");
const newFarmerLocation = document.getElementById("newFarmerLocation");
const newFarmerLand = document.getElementById("newFarmerLand");
const newFarmerCrops = document.getElementById("newFarmerCrops");
const newFarmerN = document.getElementById("newFarmerN");
const newFarmerP = document.getElementById("newFarmerP");
const newFarmerK = document.getElementById("newFarmerK");
const addFarmerError = document.getElementById("addFarmerError");

let activeCameraStream = null;
let selectedDiseaseFile = null;
let currentUser = null;
let isAdminLoggedIn = false;
let currentFarmersList = [];

// Tab Navigation
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;

    tabs.forEach((item) => item.classList.remove("active"));
    panels.forEach((panel) => panel.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(target).classList.add("active");

    if (target === "admin" && isAdminLoggedIn) {
      loadAdminDashboardData();
    }
  });
});

// Initialize Authentication & Load Feeds
initAuth();
initAdminPortal();
loadCommunityMessages();

// Camera & Disease Listeners
diseaseImageInput.addEventListener("change", () => handleDiseaseFileSelected(diseaseImageInput.files?.[0]));
diseaseCameraInput.addEventListener("change", () => handleDiseaseFileSelected(diseaseCameraInput.files?.[0]));
cameraCaptureBtn.addEventListener("click", openDeviceCamera);
takePhotoBtn.addEventListener("click", capturePhotoFromVideo);
closeCameraBtn.addEventListener("click", stopDeviceCamera);

// Theme Toggle
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
});

// Crop Recommendation
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
    cropResults.innerHTML = (data.recommendations || [])
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

// Chintak AI Assistant (English Output)
askBtn.addEventListener("click", async () => {
  const query = assistantInput.value.trim();
  if (!query) return;

  assistantResponse.innerHTML = `
    <h4>Chintak is thinking...</h4>
    <p><strong>Your question:</strong> ${escapeHtml(query)}</p>
  `;

  try {
    const location = currentUser?.location || "Ahmednagar, Maharashtra";
    const npk = {
      n: Number(nitrogenInput.value || 0),
      p: Number(phosphorusInput.value || 0),
      k: Number(potassiumInput.value || 0),
    };
    const reply = await askAssistant(query, location, npk);
    assistantResponse.innerHTML = `
      <h4>Chintak AI Advice</h4>
      <p><strong>Your question:</strong> ${escapeHtml(query)}</p>
      <div style="white-space: pre-wrap; line-height: 1.6; margin-top: 0.5rem;">${escapeHtml(reply)}</div>
    `;
    assistantInput.value = "";
  } catch (error) {
    assistantResponse.innerHTML = `
      <h4>Assistant Error</h4>
      <p>${escapeHtml(error.message)}</p>
    `;
  }
});

// Community Send
chatSendBtn.addEventListener("click", () => {
  const message = chatInput.value.trim();
  if (!message) return;
  sendCommunityMessage(message);
});

// Disease Detection
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
      <p><strong>Treatment / Advice:</strong> ${escapeHtml(data.recommendation || "No recommendation")}</p>
      ${
        candidatesHtml
          ? `<p><strong>Other likely diseases:</strong></p><ul>${candidatesHtml}</ul>`
          : ""
      }
      ${
        data.imageQualityWarning
          ? `<p><strong>Image note:</strong> ${escapeHtml(data.imageQualityWarning)}</p>`
          : ""
      }
    `;
  } catch (error) {
    diseaseResponse.innerHTML = `
      <h4>Disease Detection Error</h4>
      <p>${escapeHtml(error.message)}</p>
    `;
  }
});

// Voice Input Listeners
micButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.dataset.voiceTarget;
    startVoiceInput(targetId);
  });
});

/* ---------------- ADMIN & FARMERS DATABASE HANDLERS ---------------- */

function initAdminPortal() {
  const adminToken = localStorage.getItem("krishi_admin_token");
  if (adminToken) {
    isAdminLoggedIn = true;
    showAdminDashboard();
  }

  adminLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = adminUsername.value.trim();
    const password = adminPassword.value.trim();

    try {
      const response = await fetch(`${API_BASE_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await parseApiResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "Invalid admin credentials.");
      }

      localStorage.setItem("krishi_admin_token", data.token);
      isAdminLoggedIn = true;
      showAdminDashboard();
    } catch (err) {
      adminLoginError.textContent = err.message;
      adminLoginError.classList.remove("hidden");
    }
  });

  adminLogoutBtn.addEventListener("click", () => {
    localStorage.removeItem("krishi_admin_token");
    isAdminLoggedIn = false;
    adminDashboardView.classList.add("hidden");
    adminGateCard.classList.remove("hidden");
    adminPassword.value = "";
  });

  farmerSearchInput.addEventListener("input", () => filterFarmersTable());
  farmerCropFilter.addEventListener("change", () => filterFarmersTable());

  openAddFarmerBtn.addEventListener("click", () => {
    addFarmerModal.classList.remove("hidden");
  });

  closeAddFarmerBtn.addEventListener("click", () => {
    addFarmerModal.classList.add("hidden");
    addFarmerError.classList.add("hidden");
  });

  exportFarmersBtn.addEventListener("click", () => exportFarmersToCSV());

  addFarmerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = newFarmerName.value.trim();
    const contact = newFarmerContact.value.trim();
    const location = newFarmerLocation.value.trim();
    const landArea = newFarmerLand.value.trim();
    const crops = newFarmerCrops.value.trim();
    const n = Number(newFarmerN.value || 60);
    const p = Number(newFarmerP.value || 40);
    const k = Number(newFarmerK.value || 40);

    if (!name || !contact) {
      addFarmerError.textContent = "Please provide Farmer Name and Contact.";
      addFarmerError.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/farmers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contact,
          location,
          landArea,
          crops,
          soilNPK: { n, p, k },
        }),
      });

      const data = await parseApiResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "Could not add farmer record.");
      }

      addFarmerForm.reset();
      addFarmerModal.classList.add("hidden");
      addFarmerError.classList.add("hidden");
      loadAdminDashboardData();
    } catch (err) {
      addFarmerError.textContent = err.message;
      addFarmerError.classList.remove("hidden");
    }
  });
}

function showAdminDashboard() {
  adminGateCard.classList.add("hidden");
  adminDashboardView.classList.remove("hidden");
  loadAdminDashboardData();
}

async function loadAdminDashboardData() {
  try {
    // 1. Fetch Stats
    const statsRes = await fetch(`${API_BASE_URL}/admin/stats`);
    const statsData = await parseApiResponse(statsRes);
    if (statsRes.ok) {
      statTotalFarmers.textContent = statsData.totalFarmers || "0";
      statTotalAcres.textContent = statsData.totalAcres || "0 Acres";
      statTotalInquiries.textContent = `${statsData.totalInquiries || 0}+`;
      statRegionsCount.textContent = `${statsData.regionsCount || 0} Districts`;
    }

    // 2. Fetch Farmers Table
    const farmersRes = await fetch(`${API_BASE_URL}/farmers`);
    const farmersData = await parseApiResponse(farmersRes);
    if (farmersRes.ok) {
      currentFarmersList = farmersData.farmers || [];
      renderFarmersTable(currentFarmersList);
    }
  } catch (err) {
    console.error("Admin data load error:", err);
  }
}

function renderFarmersTable(farmers) {
  if (!farmers || farmers.length === 0) {
    farmersTableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding: 2rem; color: var(--muted);">
          No farmer records found matching the criteria.
        </td>
      </tr>
    `;
    return;
  }

  farmersTableBody.innerHTML = farmers
    .map((f) => {
      const cropsHtml = (f.crops || [])
        .map((c) => `<span class="crop-tag">${escapeHtml(c)}</span>`)
        .join("");

      const npkText = f.soilNPK ? `N:${f.soilNPK.n} P:${f.soilNPK.p} K:${f.soilNPK.k}` : "N/A";

      return `
      <tr>
        <td><strong>${escapeHtml(f.id)}</strong></td>
        <td>
          <div style="font-weight: 700;">${escapeHtml(f.name)}</div>
          <small class="muted">${escapeHtml(f.contact)}</small>
        </td>
        <td>${escapeHtml(f.location)}</td>
        <td>${escapeHtml(f.landArea || "N/A")}</td>
        <td>${cropsHtml || "Mixed"}</td>
        <td><small style="background: var(--surface-2); padding: 3px 6px; border-radius: 6px;">${npkText}</small></td>
        <td><span class="status-pill">${escapeHtml(f.status || "Active")}</span></td>
        <td>
          <button class="btn-delete" onclick="deleteFarmerRecord('${escapeHtml(f.id)}')">Delete</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

function filterFarmersTable() {
  const search = farmerSearchInput.value.trim().toLowerCase();
  const crop = farmerCropFilter.value.trim().toLowerCase();

  const filtered = currentFarmersList.filter((f) => {
    const matchesSearch =
      !search ||
      f.name.toLowerCase().includes(search) ||
      f.contact.includes(search) ||
      f.location.toLowerCase().includes(search) ||
      f.id.toLowerCase().includes(search);

    const matchesCrop =
      !crop || (f.crops || []).some((c) => c.toLowerCase().includes(crop));

    return matchesSearch && matchesCrop;
  });

  renderFarmersTable(filtered);
}

window.deleteFarmerRecord = async function (id) {
  if (!confirm(`Are you sure you want to delete farmer record ${id}?`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/farmers/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await parseApiResponse(res);
    if (!res.ok) {
      throw new Error(data.error || "Failed to delete farmer record.");
    }
    loadAdminDashboardData();
  } catch (err) {
    alert(err.message);
  }
};

function exportFarmersToCSV() {
  if (!currentFarmersList || currentFarmersList.length === 0) {
    alert("No farmer data to export.");
    return;
  }

  const headers = ["ID", "Name", "Contact", "Location", "Land Area", "Crops", "Soil N", "Soil P", "Soil K", "Registered Date"];
  const rows = currentFarmersList.map((f) => [
    f.id,
    `"${f.name}"`,
    f.contact,
    `"${f.location}"`,
    `"${f.landArea}"`,
    `"${(f.crops || []).join(", ")}"`,
    f.soilNPK?.n || "",
    f.soilNPK?.p || "",
    f.soilNPK?.k || "",
    f.registeredDate || "",
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `farmers_registry_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ---------------- AUTHENTICATION HANDLERS ---------------- */

function initAuth() {
  const savedUser = localStorage.getItem("krishi_user");
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
    } catch {
      currentUser = null;
    }
  }

  updateAuthUI();

  // If first time visit (no user and never dismissed modal), prompt with login modal
  const hasVisited = localStorage.getItem("krishi_has_visited");
  if (!currentUser && !hasVisited) {
    showAuthModal();
  }

  // Auth Button Listeners
  openAuthBtn.addEventListener("click", () => showAuthModal());
  closeAuthBtn.addEventListener("click", () => hideAuthModal());
  guestLoginBtn.addEventListener("click", () => {
    localStorage.setItem("krishi_has_visited", "true");
    hideAuthModal();
  });

  logoutBtn.addEventListener("click", () => {
    currentUser = null;
    localStorage.removeItem("krishi_user");
    updateAuthUI();
  });

  tabLoginBtn.addEventListener("click", () => {
    tabLoginBtn.classList.add("active");
    tabRegisterBtn.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    loginError.classList.add("hidden");
  });

  tabRegisterBtn.addEventListener("click", () => {
    tabRegisterBtn.classList.add("active");
    tabLoginBtn.classList.remove("active");
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    regError.classList.add("hidden");
  });

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const contact = loginContact.value.trim();
    const pass = loginPassword.value.trim();

    if (!contact || !pass) {
      showError(loginError, "Please enter both contact and password.");
      return;
    }

    const registeredUsers = JSON.parse(localStorage.getItem("krishi_registered_users") || "[]");
    const existing = registeredUsers.find((u) => u.contact === contact);

    if (existing && existing.password !== pass) {
      showError(loginError, "Incorrect password or PIN.");
      return;
    }

    const user = existing || {
      name: `Farmer (${contact.slice(-4)})`,
      contact,
      location: "Ahmednagar, Maharashtra",
      crops: "Mixed Crops",
    };

    currentUser = user;
    localStorage.setItem("krishi_user", JSON.stringify(user));
    localStorage.setItem("krishi_has_visited", "true");
    updateAuthUI();
    hideAuthModal();
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = regName.value.trim();
    const contact = regContact.value.trim();
    const location = regLocation.value.trim();
    const crops = regCrops.value.trim();
    const password = regPassword.value.trim();

    if (!name || !contact || !location || !password) {
      showError(regError, "Please fill out all required fields.");
      return;
    }

    const newUser = { name, contact, location, crops, password };
    const registeredUsers = JSON.parse(localStorage.getItem("krishi_registered_users") || "[]");
    
    const idx = registeredUsers.findIndex((u) => u.contact === contact);
    if (idx !== -1) {
      registeredUsers[idx] = newUser;
    } else {
      registeredUsers.push(newUser);
    }

    localStorage.setItem("krishi_registered_users", JSON.stringify(registeredUsers));
    currentUser = newUser;
    localStorage.setItem("krishi_user", JSON.stringify(newUser));
    localStorage.setItem("krishi_has_visited", "true");

    // Also auto-sync new registered farmer to backend database
    try {
      await fetch(`${API_BASE_URL}/farmers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          contact,
          location,
          crops,
          landArea: "3.0 Acres",
        }),
      });
    } catch (err) {
      console.error("Auto-sync farmer error:", err);
    }

    updateAuthUI();
    hideAuthModal();
  });
}

function showAuthModal() {
  authModal.classList.remove("hidden");
}

function hideAuthModal() {
  authModal.classList.add("hidden");
  loginError.classList.add("hidden");
  regError.classList.add("hidden");
}

function showError(elem, msg) {
  elem.textContent = msg;
  elem.classList.remove("hidden");
}

function updateAuthUI() {
  if (currentUser) {
    userProfileBadge.classList.remove("hidden");
    openAuthBtn.classList.add("hidden");
    userNameDisplay.textContent = `👨‍🌾 ${currentUser.name}`;
    if (detectedLocation && currentUser.location) {
      detectedLocation.textContent = `Detected Region: ${currentUser.location}`;
    }
  } else {
    userProfileBadge.classList.add("hidden");
    openAuthBtn.classList.remove("hidden");
    if (detectedLocation) {
      detectedLocation.textContent = "Detected Region: Ahmednagar, Maharashtra";
    }
  }
}

/* ---------------- API CALLS ---------------- */

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
    const authorName = currentUser?.name
      ? `${currentUser.name}${currentUser.location ? `, ${currentUser.location.split(",")[0]}` : ""}`
      : "You";

    const response = await fetch(`${API_BASE_URL}/community/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author: authorName, message }),
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

/* ---------------- VOICE INPUT ---------------- */

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

/* ---------------- DISEASE & CAMERA HELPERS ---------------- */

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
