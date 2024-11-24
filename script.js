// משתנים גלובליים
let transcriptionResult;
let apiKey;
let audioBlob;
let mediaRecorder;
let isRecording = false;
let audioSource = null; // 'file' או 'record'
let selectedFile = null;
let selectedLanguage = ""; // שפה שנבחרה

// פונקציה לטעינת ההגדרות
function loadSettings() {
  // טעינת ה-API Key מה-localStorage
  apiKey = localStorage.getItem("groqApiKey");
  if (apiKey) {
    document.getElementById("apiKeyInput").value = apiKey;
  }

  // טעינת הגדרות אחרות
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

// פונקציה לשמירת ההגדרות
function saveSettings() {
  const wordsPerSubtitle = document.getElementById("wordsPerSubtitle").value;
  selectedLanguage = document.getElementById("languageSelect").value;

  localStorage.setItem("wordsPerSubtitle", wordsPerSubtitle);
  localStorage.setItem("selectedLanguage", selectedLanguage);

  updateTextDirection(selectedLanguage);

  document.getElementById("settingsPopup").style.display = "none";
}

// פונקציה לעדכון כיוון הטקסט בהתאם לשפה
function updateTextDirection(language) {
  const htmlElement = document.documentElement;
  if (language === "he" || language === "ar") {
    htmlElement.dir = "rtl";
  } else {
    htmlElement.dir = "ltr";
  }
}

// פונקציה לשמירת ה-API Key
function saveApiKey() {
  const inputApiKey = document.getElementById("apiKeyInput").value.trim();
  if (inputApiKey) {
    localStorage.setItem("groqApiKey", inputApiKey);
    apiKey = inputApiKey;
    showMessage("ה-API Key נשמר בהצלחה!", "success");
    document.getElementById("apiKeyPopup").style.display = "none";
  } else {
    showMessage("אנא הזן API Key תקין", "error");
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

// שיפור הטיפול בשגיאות בפונקציית התמלול
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

  // המשך הקוד כרגיל...
  // איפוס הזמן המצטבר בתחילת תמלול חדש
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
    // בדיקת תקינות הקובץ
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
          throw error; // להפסקת התהליך
        }
      }
    }

    // עדכון הודעת הסיום
    const progressInfo = document.querySelector(
      ".transcription-progress-info"
    );
    if (progressInfo) {
      progressInfo.innerHTML = "✅ התמלול הושלם בהצלחה";
      progressInfo.style.backgroundColor = "#d4edda"; // צבע רקע ירוק בהיר
      progressInfo.style.color = "#155724"; // צבע טקסט ירוק כהה

      // הסרת ההודעה אחרי 5 שניות
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

// פונקציית transcribeChunk עם השפה הנבחרת ובדיקת ביטחון
async function transcribeChunk(chunk, chunkNumber, totalChunks) {
  const formData = new FormData();
  formData.append("file", chunk);
  formData.append("model", "whisper-large-v3");
  formData.append("response_format", "verbose_json");

  // הוסף את השפה רק אם המשתמש בחר שפה מסוימת
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

        // עדכון הזמנים של הסגמנטים בחלק הנוכחי
        if (response.segments) {
          response.segments = response.segments.map((segment) => ({
            ...segment,
            start: segment.start + accumulatedDuration,
            end: segment.end + accumulatedDuration,
          }));

          // עדכון הזמן המצטבר לחלק הבא
          if (response.segments.length > 0) {
            const lastSegment =
              response.segments[response.segments.length - 1];
            accumulatedDuration = lastSegment.end;
          }
        }

        resolve(response);
      } else {
        // טיפול מפורט יותר בשגיאות
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
    // הגדרת טיימאאוט ארוך יותר
    xhr.timeout = 300000; // 5 דקות

    try {
      xhr.send(formData);
    } catch (error) {
      reject(new Error(`שגיאה בשליחת הקובץ: ${error.message}`));
    }
  });
}

// פונקציה לעדכון התמלול ובדיקת ביטחון
function updateTranscription(
  isPartial = false,
  currentChunk = null,
  totalChunks = null
) {
  if (!transcriptionResult) {
    console.log("אין תוצאות תמלול זמינות");
    return;
  }

  // הוספת קלאס להצגת הקארד של התמלול
  const transcriptionCard = document.querySelector(
    ".card.transcription-card"
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
        segment.avg_logprob // משתמשים ברמת הביטחון של הסגמנט
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

    // עדכון או יצירה של אינדיקטור התקדמות
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

    // הצגת התוכן
    document.getElementById("srtContent").style.display = "block";
    document.getElementById("plainTextContent").style.display = "none";

    if (isPartial) {
      const srtElement = document.getElementById("srtTranscription");
      srtElement.scrollTop = srtElement.scrollHeight;
    }

    // הפעלת כפתור ההורדה
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

    // השבתת כפתור ההורדה
    const downloadButton = document.querySelector(
      '.control-button[onclick="downloadFile()"]'
    );
    if (downloadButton) {
      downloadButton.disabled = true;
      downloadButton.style.opacity = "0.5";
    }
  }
}

// פונקציה לפיצול לטקסטים קטנים ולבדיקת רמת הביטחון
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

      // בדיקת רמת הביטחון
      if (avgLogprob && avgLogprob < -1.0) {
        // רמת ביטחון נמוכה, הוספת סגנון מיוחד
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

    // הוספת מאזינים לאירועים לכפתורים
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

// הוספת מאזין לאירוע טעינת הדף
document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  // שאר הקוד שלך...
});

// פונקציות נוספות...
