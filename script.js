import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const filesRef = ref(db, "files");

const fileForm = document.getElementById("fileForm");
const fileType = document.getElementById("fileType");
const fileNameInput = document.getElementById("fileName");
const fileNameDropdown = document.getElementById("fileNameDropdown");
const filesTableBody = document.querySelector("#filesTable tbody");
const searchBar = document.getElementById("searchBar");
const refreshBtn = document.getElementById("refreshBtn");

let files = [];

onValue(filesRef, (snapshot) => {
  files = [];
  snapshot.forEach((child) => {
    files.push({ id: child.key, ...child.val() });
  });
  renderTable();
});

// Filter Dropdown by fileType
fileType.addEventListener("change", () => {
  const selectedType = fileType.value;
    console.log("Selected Type: ", selectedType);
  const filtered = files.filter(f => f.fileType === selectedType && (f.status === 'Received' || f.status === 'Closed'));
  console.log("Matched received/closed files: ", filtered);

  if (filtered.length) {
    fileNameDropdown.innerHTML =
      '<option value="">Select Existing File</option>' +
      filtered.map((f) => `<option value="${f.fileName}">${f.fileName}</option>`).join("");
    fileNameDropdown.style.display = "block";
  } else {
    fileNameDropdown.innerHTML = "";
    fileNameDropdown.style.display = "none";
  }

  fileNameInput.style.display = "block";
});

// Submit form
fileForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fileTypeVal = fileType.value;
  const fileNameVal = fileNameDropdown.value || fileNameInput.value.trim();
  if (!fileTypeVal || !fileNameVal) return;

  const data = {
    fileType: fileTypeVal,
    fileName: fileNameVal,
    sentBy: document.getElementById("sentBy").value,
    givenTo: document.getElementById("givenTo").value,
    dateGiven: document.getElementById("dateGiven").value,
    remarks: document.getElementById("remarks").value,
    status: document.getElementById("status").value,
  };

  const existing = files.find(
    (f) => f.fileType === fileTypeVal && f.fileName === fileNameVal
  );

  if (existing) {
    const history = existing.history || [];
    history.push({
      date: new Date().toISOString().split("T")[0],
      status: data.status,
      sentBy: data.sentBy,
      givenTo: data.givenTo,
      remarks: data.remarks,
    });
    await update(ref(db, `files/${existing.id}`), { ...data, history });
  } else {
    data.history = [
      {
        date: new Date().toISOString().split("T")[0],
        status: data.status,
        sentBy: data.sentBy,
        givenTo: data.givenTo,
        remarks: data.remarks,
      },
    ];
    await push(filesRef, data);
  }

  fileForm.reset();
  fileNameDropdown.style.display = "none";
  fileNameInput.style.display = "block";
});

// Render table (Pending + Forwarded)
function renderTable() {
  const filter = searchBar.value.toLowerCase();
  const filtered = files.filter(
    (f) =>
      (f.status === "Pending" || f.status === "Forwarded") &&
      (f.fileName.toLowerCase().includes(filter) || f.fileType?.toLowerCase().includes(filter))
  );

  filesTableBody.innerHTML = filtered.length
    ? filtered
        .map(
          (f) => `
      <tr>
        <td>${f.fileType}</td>
        <td>${f.fileName}</td>
        <td>${f.sentBy}</td>
        <td>${f.givenTo}</td>
        <td>${f.dateGiven}</td>
        <td>${f.remarks || ""}</td>
        <td><span class="status-${f.status.toLowerCase()}">${f.status}</span></td>
<td>
  <button class="update-btn" data-id="${f.id}">Update</button>
</td>
<td>
  <button class="history-btn" data-id="${f.id}">View History</button>
</td>

      </tr>`
        )
        .join("")
    : `<tr><td colspan="8" style="text-align:center;">No files found</td></tr>`;
}

searchBar.addEventListener("input", renderTable);
refreshBtn.addEventListener("click", renderTable);

// Action buttons (history + update)
filesTableBody.addEventListener("click", (e) => {
  const id = e.target.dataset.id;
  const file = files.find((f) => f.id === id);

  if (e.target.classList.contains("history-btn")) {
    const modal = document.getElementById("historyModal");
    const content = document.getElementById("historyContent");
    content.innerHTML = file?.history?.length
      ? file.history.map(h => `
        <div><b>Date:</b> ${h.date} | <b>Status:</b> ${h.status} | <b>To:</b> ${h.givenTo} | <b>By:</b> ${h.sentBy}<br><b>Remarks:</b> ${h.remarks}</div><hr>
      `).join("")
      : "<i>No history found</i>";
    modal.style.display = "block";
  }

  if (e.target.classList.contains("update-btn")) {
    const modal = document.getElementById("statusModal");
    modal.dataset.fileId = file.id;
    document.getElementById("updateStatus").value = file.status;
    document.getElementById("updateGivenTo").value = file.givenTo;
    document.getElementById("updateRemarks").value = "";
    modal.style.display = "block";
  }
});

// Close modals
document.getElementById("closeHistoryModal").onclick = () =>
  (document.getElementById("historyModal").style.display = "none");

document.getElementById("closeStatusModal").onclick = () => {
  document.getElementById("statusModal").style.display = "none";
  delete document.getElementById("statusModal").dataset.fileId;
};

// Submit update
document.getElementById("statusForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const modal = document.getElementById("statusModal");
  const id = modal.dataset.fileId;
  const file = files.find((f) => f.id === id);

  const newStatus = document.getElementById("updateStatus").value;
  const newGivenTo = document.getElementById("updateGivenTo").value;
  const newRemarks = document.getElementById("updateRemarks").value;

  const history = file.history || [];
  history.push({
    date: new Date().toISOString().split("T")[0],
    status: newStatus,
    sentBy: file.sentBy,
    givenTo: newGivenTo,
    remarks: newRemarks,
  });

  await update(ref(db, `files/${id}`), {
    ...file,
    status: newStatus,
    givenTo: newGivenTo,
    remarks: newRemarks,
    history,
  });

  modal.style.display = "none";
});
