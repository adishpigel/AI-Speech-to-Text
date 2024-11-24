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
}

function stopTranscription() {
  // קוד לעצירת התמלול
  console.log("תמלול נעצר");
}

// פונקציות לייבוא וייצוא קבצים
function importFile() {
  // קוד לייבוא קובץ
  console.log("ייבוא קובץ");
}

function exportFile() {
  // קוד לייצוא קובץ
  console.log("ייצוא קובץ");
}
