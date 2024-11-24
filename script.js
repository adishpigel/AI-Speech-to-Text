// משתנים גלובליים
let transcriptionResult;
let apiKey;
let audioBlob;
let mediaRecorder;
let isRecording = false;
let audioSource = null; // 'file' או 'record'
let selectedFile = null;
let selectedLanguage = ""; // שפה שנבחרה
let accumulatedDuration = 0;

// טעינת ההגדרות בעת טעינת הדף
document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  loadApiKey();
});

// פונקציות לפופאפים
function showPopup(popupId) {
  document.getElementById(popupId).style.display = "flex";
}

function closePopup(popupId) {
  document.getElementById(popupId).style.display = "none";
}

// פונקציות להגדרת API Key
function saveApiKey() {
  const inputApiKey = document.getElementById("apiKeyInput").value.trim();
  if (inputApiKey) {
    localStorage.setItem("groqApiKey", inputApiKey);
    apiKey = inputApiKey;
    showMessage("ה-API Key נשמר בהצלחה!", "success");
    closePopup("apiKeyPopup");
  } else {
    showMessage("אנא הזן API Key תקין", "error");
  }
}

function loadApiKey() {
  apiKey = localStorage.getItem("groqApiKey");
  if (apiKey) {
    document.getElementById("apiKeyInput").value = apiKey;
  }
}

// פונקציות לבחירת מקור אודיו
function showAudioTab(tabName) {
  document
    .querySelectorAll("#audioInputPopup .tab-button")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll("#audioInputPopup .tab-content")
    .forEach((content) => content.classList.remove("active"));

  document
    .querySelector(`#audioInputPopup .tab-button[onclick="showAudioTab('${tabName}')"]`)
    .classList.add("active");
  document.getElementById(`${tabName}InputTab`).classList.add("active");

  audioSource = tabName;
  if (tabName === "file") {
    selectedFile = null;
    document.getElementById("audioFile").value = "";
  } else {
    audioBlob = null;
  }
  updateRecordingStatus();
}

function handleFileSelect(event) {
  selectedFile = event.target.files[0];
  if (selectedFile) {
    showMessage(`נבחר קובץ: ${selectedFile.name}`, "info");
  }
}

function confirmAudioInput() {
  if (audioSource === "file") {
    if (!selectedFile) {
      showMessage("אנא בחר קובץ אודיו", "error");
      return;
    }
    showMessage(`נבחר קובץ: ${selectedFile.name}`, "success");
  } else if (audioSource === "record") {
    if (!audioBlob) {
      showMessage("אנא הקלט אודיו תחילה", "error");
      return;
    }
    showMessage("הקלטה נשמרה", "success");
  }
  closePopup("audioInputPopup");
}

// פונקציות להקלטה
function updateRecordingStatus() {
  const recordingStatus = document.getElementById("recordingStatus");
  const recordButton = document.getElementById("recordButton");
  if (audioBlob) {
    recordingStatus.style.display = "block";
    recordButton.innerHTML =
      '<i class="fas fa-microphone"></i> הקלט מחדש';
  } else {
    recordingStatus.style.display = "none";
    recordButton.innerHTML =
      '<i class="fas fa-microphone"></i> התחל הקלטה';
  }
}

function deleteRecording() {
  audioBlob = null;
  updateRecordingStatus();
}

async function toggleRecording() {
  if (!isRecording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        audioBlob = new Blob(chunks, { type: "audio/wav" });
        updateRecordingStatus();
      };

      mediaRecorder.start();
      isRecording = true;
      document.getElementById("recordButton").innerHTML =
        '<i class="fas fa-stop"></i> עצור הקלטה';
    } catch (error) {
      console.error("שגיאה בהקלטה:", error);
      showMessage(
        "לא ניתן להתחיל הקלטה. אנא ודא שיש לך מיקרופון זמין.",
        "error"
      );
    }
  } else {
    mediaRecorder.stop();
    isRecording = false;
    document.getElementById("recordButton").innerHTML =
      '<i class="fas fa-microphone"></i> הקלט מחדש';
  }
}

// פונקציות להגדרות
function saveSettings() {
  const wordsPerSubtitle = document.getElementById("wordsPerSubtitle").value;
  selectedLanguage = document.getElementById("languageSelect").value;

  localStorage.setItem("wordsPerSubtitle", wordsPerSubtitle);
  localStorage.setItem("selectedLanguage", selectedLanguage);

  updateTextDirection(selectedLanguage);

  closePopup("settingsPopup");
}

function loadSettings() {
  const savedWordsPerSubtitle = localStorage.getItem("wordsPerSubtitle");
  const savedLanguage = localStorage.getItem("selectedLanguage");

  if (savedWordsPerSubtitle) {
    document.getElementById("wordsPerSubtitle").value = savedWordsPerSubtitle;
  }
  if (savedLanguage !== null) {
    document.getElementById("languageSelect").value = savedLanguage;
    selectedLanguage = savedLanguage;
    updateTextDirection(selectedLanguage);
  }
}

function updateTextDirection(language) {
  const htmlElement = document.documentElement;
  if (language === "he" || language === "ar") {
    htmlElement.dir = "rtl";
  } else {
    htmlElement.dir = "ltr";
  }
}

// פונקציה להצגת הודעות למשתמש
function showMessage(message, type = "info", duration = 3000) {
  const messageElement = document.createElement("div");
  messageElement.textContent = message;
  messageElement.className = `message ${type}`;
  document.body.appendChild(messageElement);

  setTimeout(() => {
    document.body.removeChild(messageElement);
  }, duration);
}

// פונקציות לתמלול
async function transcribe() {
  if (!apiKey) {
    showMessage("אנא הגדר API Key תחילה", "error");
    showPopup("apiKeyPopup");
    return;
  }

  if (!audioSource) {
    showMessage("אנא בחר מקור אודיו (קובץ או הקלטה)", "error");
    showPopup("audioInputPopup");
    return;
  }

  accumulatedDuration = 0;

  let audioFile;
  if (audioSource === "file") {
    audioFile = selectedFile;
    if (!audioFile) {
      showMessage("אנא בחר קובץ אודיו", "error");
      return;
    }
  } else if (audioSource === "record") {
    if (!audioBlob) {
      showMessage("אנא הקלט אודיו תחילה", "error");
      return;
    }
    audioFile = new File([audioBlob], "recorded_audio.wav", {
      type: "audio/wav",
    });
  } else {
    showMessage("אנא בחר מקור אודיו (קובץ או הקלטה)", "error");
    return;
  }

  showMessage("מתחיל תמלול...", "info", 0);
  document.getElementById("loader").style.display = "block";
  document.getElementById("progressContainer").style.display = "block";
  document.getElementById("transcribeButton").disabled = true;

  try {
    validateAudioFile(audioFile);

    const CHUNK_SIZE = 25 * 1024 * 1024;
    const chunks = await splitAudioFile(audioFile, CHUNK_SIZE);
    const totalChunks = chunks.length;

    transcriptionResult = { segments: [] };

    for (let i = 0; i < chunks.length; i++) {
      const chunkNumber = i + 1;
      showMessage(`מתמלל חלק ${chunkNumber} מתוך ${totalChunks}...`, "info", 0);

      try {
        const chunkResult = await transcribeChunk(
          chunks[i],
          chunkNumber,
          totalChunks
        );

        if (chunkResult && chunkResult.segments) {
          transcriptionResult.segments =
            transcriptionResult.segments.concat(chunkResult.segments);
          transcriptionResult.segments.sort((a, b) => a.start - b.start);
          updateTranscription(true, chunkNumber, totalChunks);
        }
      } catch (error) {
        console.error(`שגיאה בתמלול חלק ${chunkNumber}:`, error);

        const shouldContinue = await showErrorDialog(
          `אירעה שגיאה בתמלול חלק ${chunkNumber} מתוך ${totalChunks}. 
                    האם ברצונך להמשיך לתמלל את החלקים הנותרים?`
        );

        if (!shouldContinue) {
          throw error;
        }
      }
    }

    // עדכון הודעת הסיום
    const progressInfo = document.querySelector(
      ".transcription-progress-info"
    );
    if (progressInfo) {
      progressInfo.innerHTML = "✅ התמלול הושלם בהצלחה";
      progressInfo.style.backgroundColor = "#d4edda";
      progressInfo.style.color = "#155724";

      setTimeout(() => {
        progressInfo.remove();
      }, 5000);
    }

    showTab("srt");
    showMessage("התמלול הושלם בהצלחה!", "success");
  } catch (error) {
    console.error("שגיאה בתמלול:", error);
    showMessage(
      error.message ||
        "אירעה שגיאה בתמלול. אנא בדוק את ה-API Key שלך ונסה שוב.",
      "error"
    );
    if (error.message.includes("API Key")) {
      localStorage.removeItem("groqApiKey");
      apiKey = null;
    }
  } finally {
    document.getElementById("loader").style.display = "none";
    document.getElementById("progressContainer").style.display = "none";
    document.getElementById("transcribeButton").disabled = false;
    updateProgress(0);
  }
}

function validateAudioFile(file) {
  const validTypes = [
    "audio/wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/mp4",
    "audio/m4a",
    "audio/ogg",
    "audio/flac",
    "audio/webm",
  ];

  if (!validTypes.includes(file.type)) {
    throw new Error(
      "סוג הקובץ לא נתמך. אנא השתמש בקובץ בפורמט נתמך כגון WAV, MP3, M4A, OGG או FLAC."
    );
  }

  return true;
}

async function splitAudioFile(file, chunkSize) {
  const chunks = [];
  for (let start = 0; start < file.size; start += chunkSize) {
    const chunk = file.slice(
      start,
      Math.min(start + chunkSize, file.size)
    );
    chunks.push(
      new File(
        [chunk],
        `chunk_${chunks.length + 1}.${file.name.split(".").pop()}`,
        { type: file.type }
      )
    );
  }
  return chunks;
}

function updateProgress(percent, chunkInfo = "") {
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");

  progressFill.style.width = `${percent}%`;
  progressText.innerHTML = chunkInfo || `${Math.round(percent)}%`;
}

async function transcribeChunk(chunk, chunkNumber, totalChunks) {
  const formData = new FormData();
  formData.append("file", chunk);
  formData.append("model", "whisper-large-v3");
  formData.append("response_format", "verbose_json");

  if (selectedLanguage) {
    formData.append("language", selectedLanguage);
  }

  formData.append("temperature", "0");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const chunkProgress = (event.loaded / event.total) * 100;
        const previousChunksProgress =
          ((chunkNumber - 1) / totalChunks) * 100;
        const currentChunkContribution = chunkProgress / totalChunks;
        const totalProgress =
          previousChunksProgress + currentChunkContribution;

        const progressInfo = `
                    חלק ${chunkNumber} מתוך ${totalChunks}<br>
                    התקדמות בחלק הנוכחי: ${Math.round(
                      chunkProgress
                    )}%<br>
                    התקדמות כללית: ${Math.round(totalProgress)}%
                `;

        updateProgress(totalProgress, progressInfo);
      }
    };

    xhr.onload = async () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);

        if (response.segments) {
          response.segments = response.segments.map((segment) => ({
            ...segment,
            start: segment.start + accumulatedDuration,
            end: segment.end + accumulatedDuration,
          }));

          if (response.segments.length > 0) {
            const lastSegment =
              response.segments[response.segments.length - 1];
            accumulatedDuration = lastSegment.end;
          }
        }

        resolve(response);
      } else {
        let errorMessage = "שגיאת שרת לא ידועה";
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          errorMessage =
            errorResponse.error?.message ||
            errorResponse.message ||
            errorMessage;
        } catch (e) {
          errorMessage = xhr.responseText || errorMessage;
        }
        console.error("Server Error:", {
          status: xhr.status,
          message: errorMessage,
          response: xhr.responseText,
        });
        reject(new Error(`שגיאת שרת (${xhr.status}): ${errorMessage}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("שגיאת רשת - אנא בדוק את החיבור לאינטרנט"));
    };

    xhr.ontimeout = () => {
      reject(new Error("פסק זמן - הבקשה ארכה זמן רב מדי"));
    };

    xhr.open(
      "POST",
      "https://api.groq.com/openai/v1/audio/transcriptions"
    );
    xhr.setRequestHeader("Authorization", `Bearer ${apiKey}`);
    xhr.timeout = 300000;

    try {
      xhr.send(formData);
    } catch (error) {
      reject(new Error(`שגיאה בשליחת הקובץ: ${error.message}`));
    }
  });
}

function updateTranscription(
  isPartial = false,
  currentChunk = null,
  totalChunks = null
) {
  if (!transcriptionResult) {
    console.log("אין תוצאות תמלול זמינות");
    return;
  }

  const transcriptionCard = document.querySelector(
    ".transcription-card"
  );
  transcriptionCard.classList.add("has-content");

  const wordsPerSubtitle = parseInt(
    document.getElementById("wordsPerSubtitle").value
  );

  if (
    transcriptionResult.segments &&
    transcriptionResult.segments.length > 0
  ) {
    let srtFormat = "";
    let plainText = "";
    let subtitleIndex = 1;

    transcriptionResult.segments.forEach((segment) => {
      const subtitles = splitIntoSubtitles(
        segment.text,
        segment.start,
        segment.end,
        wordsPerSubtitle,
        segment.avg_logprob
      );
      subtitles.forEach((subtitle) => {
        srtFormat += `${subtitleIndex}\n`;
        srtFormat += `${formatTime(subtitle.start)} --> ${formatTime(
          subtitle.end
        )}\n`;
        srtFormat += `${subtitle.text}\n\n`;
        plainText += subtitle.text + " ";
        subtitleIndex++;
      });
    });

    document.getElementById(
      "srtTranscription"
    ).innerHTML = `<pre>${srtFormat}</pre>`;
    document.getElementById("plainTextTranscription").innerHTML =
      plainText.trim();

    if (isPartial && currentChunk) {
      let progressInfo = document.querySelector(
        ".transcription-progress-info"
      );
      if (!progressInfo) {
        progressInfo = document.createElement("div");
        progressInfo.className = "transcription-progress-info";
        progressInfo.style.textAlign = "center";
        progressInfo.style.padding = "10px";
        progressInfo.style.backgroundColor = "#fff3cd";
        progressInfo.style.marginBottom = "10px";
        const srtContainer = document.getElementById("srtContent");
        srtContainer.insertBefore(progressInfo, srtContainer.firstChild);
      }
      progressInfo.innerHTML = `⚠️ תמלול בתהליך: חלק ${currentChunk} מתוך ${totalChunks}`;
    }

    document.getElementById("srtContent").style.display = "block";
    document.getElementById("plainTextContent").style.display = "none";

    if (isPartial) {
      const srtElement = document.getElementById("srtTranscription");
      srtElement.scrollTop = srtElement.scrollHeight;
    }

    const downloadButton = document.querySelector(
      '.control-button[onclick="downloadFile()"]'
    );
    if (downloadButton) {
      downloadButton.disabled = false;
      downloadButton.style.opacity = "1";
    }
  } else {
    document.getElementById("srtTranscription").innerHTML =
      "<p>לא התקבל תמלול או שהתמלול ריק</p>";
    document.getElementById("plainTextTranscription").textContent =
      "לא התקבל תמלול או שהתמלול ריק";

    const downloadButton = document.querySelector(
      '.control-button[onclick="downloadFile()"]'
    );
    if (downloadButton) {
      downloadButton.disabled = true;
      downloadButton.style.opacity = "0.5";
    }
  }
}

function formatTime(seconds) {
  const date = new Date(seconds * 1000);
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const secs = date.getUTCSeconds().toString().padStart(2, "0");
  const ms = date.getUTCMilliseconds().toString().padStart(3, "0");
  return `${hours}:${minutes}:${secs},${ms}`;
}

function splitIntoSubtitles(
  text,
  startTime,
  endTime,
  maxWords,
  avgLogprob
) {
  const words = text.split(" ");
  const subtitles = [];
  let currentSubtitle = { text: "", start: startTime };
  let wordCount = 0;

  words.forEach((word, index) => {
    currentSubtitle.text += word + " ";
    wordCount++;

    if (wordCount === maxWords || index === words.length - 1) {
      const progress = (index + 1) / words.length;
      currentSubtitle.end = startTime + (endTime - startTime) * progress;

      if (avgLogprob && avgLogprob < -1.0) {
        currentSubtitle.text = `<span class="low-confidence">${currentSubtitle.text.trim()}</span>`;
      } else {
        currentSubtitle.text = currentSubtitle.text.trim();
      }

      subtitles.push({
        ...currentSubtitle,
      });

      if (index < words.length - 1) {
        currentSubtitle = { text: "", start: currentSubtitle.end };
        wordCount = 0;
      }
    }
  });

  return subtitles;
}

function showTab(tabName) {
  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.remove("active"));
  document
    .querySelectorAll(".tab-button")
    .forEach((button) => button.classList.remove("active"));

  document.getElementById(`${tabName}Content`).classList.add("active");
  document
    .querySelector(`.tab-button[onclick="showTab('${tabName}')"]`)
    .classList.add("active");
}

function copyToClipboard() {
  const text = document.querySelector(".tab-content.active").innerText;
  navigator.clipboard.writeText(text).then(
    () => {
      showMessage("הטקסט הועתק ללוח", "success");
    },
    (err) => {
      console.error("שגיאה בהעתקה: ", err);
      showMessage("שגיאה בהעתקת הטקסט", "error");
    }
  );
}

function downloadFile() {
  if (
    !transcriptionResult ||
    !transcriptionResult.segments ||
    transcriptionResult.segments.length === 0
  ) {
    showMessage("אין תמלול זמין להורדה", "error");
    return;
  }

  const downloadPopup = document.createElement("div");
  downloadPopup.className = "popup";
  downloadPopup.style.display = "flex";

  const defaultFileName = selectedFile
    ? selectedFile.name.split(".")[0]
    : "transcription";

  downloadPopup.innerHTML = `
    <div class="popup-content">
      <h3>הורדת קובץ</h3>
      <div style="margin-bottom: 15px;">
        <label for="fileName">שם הקובץ:</label>
        <input type="text" id="fileName" value="${defaultFileName}" style="width: 100%; margin-top: 5px; padding: 5px;">
      </div>
      <div class="popup-footer">
        <button class="control-button" id="downloadSrt">
          <i class="fas fa-download"></i> הורד כ-SRT
        </button>
        <button class="control-button" id="downloadTxt">
          <i class="fas fa-download"></i> הורד כטקסט
        </button>
        <button class="control-button" id="cancelDownload">ביטול</button>
      </div>
    </div>
  `;

  document.body.appendChild(downloadPopup);

  document.getElementById("downloadSrt").onclick = () => {
    const fileName =
      document.getElementById("fileName").value.trim() || defaultFileName;
    const content = document.getElementById("srtTranscription").innerText;
    downloadContent(content, `${fileName}.srt`);
    downloadPopup.remove();
  };

  document.getElementById("downloadTxt").onclick = () => {
    const fileName =
      document.getElementById("fileName").value.trim() || defaultFileName;
    const content = document.getElementById(
      "plainTextTranscription"
    ).innerText;
    downloadContent(content, `${fileName}.txt`);
    downloadPopup.remove();
  };

  document.getElementById("cancelDownload").onclick = () => {
    downloadPopup.remove();
  };
}

function downloadContent(content, fileName) {
  let mimeType = "text/plain;charset=utf-8";

  if (fileName.endsWith(".srt")) {
    mimeType = "application/x-subrip;charset=utf-8";
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function summarizeTranscription() {
  // פונקציה לסיכום התמלול
  // יש לממש בהתאם לצורך
}

// פונקציות נוספות...

// פונקציה להצגת דיאלוג שגיאה
function showErrorDialog(message) {
  return new Promise((resolve) => {
    const dialog = document.createElement("div");
    dialog.className = "popup";
    dialog.style.display = "flex";

    dialog.innerHTML = `
          <div class="popup-content">
              <h3>שגיאה בתמלול</h3>
              <p>${message}</p>
              <div class="popup-footer">
                  <button class="control-button" id="yesButton">כן</button>
                  <button class="control-button" id="noButton">לא</button>
              </div>
          </div>
      `;

    document.body.appendChild(dialog);

    document.getElementById("yesButton").onclick = () => {
      dialog.remove();
      resolve(true);
    };

    document.getElementById("noButton").onclick = () => {
      dialog.remove();
      resolve(false);
    };
  });
}

function toggleTranscription(button) {
  const container = button.closest(".transcription-container");
  const isExpanded = container.classList.contains("expanded");

  container.classList.toggle("expanded");
  button.textContent = isExpanded ? "הצג הכל" : "הצג פחות";
}

// פונקציה לפתיחת וסגירת התפריט במובייל
function toggleMenu() {
  const nav = document.querySelector("header nav ul");
  nav.classList.toggle("show");
}
