// פונקציות לפופאפים
function showPopup(popupId) {
  document.getElementById(popupId).style.display = "flex";
}

function closePopup(popupId) {
  document.getElementById(popupId).style.display = "none";
}

// פונקציות להתחלת ועצירת התמלול
function startTranscription() {
  // קוד להתחלת התמלול
  console.log("תמלול התחיל");
  // הצגת הודעה זמנית למשתמש
  showMessage("התמלול התחיל", "success");
}

function stopTranscription() {
  // קוד לעצירת התמלול
  console.log("תמלול נעצר");
  showMessage("התמלול נעצר", "info");
}

// פונקציות לייבוא וייצוא קבצים
function importFile() {
  // קוד לייבוא קובץ
  console.log("ייבוא קובץ");
  showMessage("קובץ יובא בהצלחה", "success");
}

function exportFile() {
  // קוד לייצוא קובץ
  console.log("ייצוא קובץ");
  showMessage("קובץ יוצא בהצלחה", "success");
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

// פונקציה לשיתוף האפליקציה
function shareApp() {
  if (navigator.share) {
    navigator
      .share({
        title: "AITexter - תמלול אודיו חכם",
        text: "בדוק את AITexter לתמלול מהיר וחכם של אודיו!",
        url: window.location.href,
      })
      .then(() => console.log("Shared successfully"))
      .catch((error) => console.error("Error sharing", error));
  } else {
    showMessage("שיתוף אינו נתמך בדפדפן זה", "error");
  }
}

// פונקציה להציג אזורים שונים בעמוד
function showSection(sectionId) {
  // הסתרת כל האזורים
  document.querySelectorAll("main > div").forEach((div) => {
    div.style.display = "none";
  });

  // הצגת האזור המבוקש
  const section = document.getElementById(sectionId);
  if (section) {
    section.style.display = "block";
  }
}

// פונקציה לפתיחת וסגירת התפריט במובייל
function toggleMenu() {
  const nav = document.querySelector("header nav ul");
  nav.classList.toggle("show");
}

// הוספת מאזין לטעינת הדף
document.addEventListener("DOMContentLoaded", () => {
  // קוד שירוץ לאחר טעינת הדף
});
