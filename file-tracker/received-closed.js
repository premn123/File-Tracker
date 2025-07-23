import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const filesRef = ref(db, 'files');
const filesTableBody = document.querySelector('#filesTable tbody');
const historyModal = document.getElementById('historyModal');
const historyContent = document.getElementById('historyContent');
const closeHistoryModal = document.getElementById('closeHistoryModal');

onValue(filesRef, (snapshot) => {
  const rows = [];
  snapshot.forEach(child => {
    const file = { id: child.key, ...child.val() };
    if (file.status === 'Received' || file.status === 'Closed') {
      rows.push(file);
    }
  });
  renderTable(rows);
});

function renderTable(files) {
  filesTableBody.innerHTML = files.length
    ? files.map(f => `
      <tr>
        <td>${f.fileType}</td>
        <td>${f.fileName}</td>
        <td>${f.sentBy}</td>
        <td>${f.givenTo}</td>
        <td>${f.dateGiven}</td>
        <td>${f.remarks || ''}</td>
        <td><span class="status-${f.status.toLowerCase()}">${f.status}</span></td>
        <td><button class="history-btn" data-id="${f.id}">View History</button></td>
      </tr>
    `).join('')
    : `<tr><td colspan="8" style="text-align:center;">No files found</td></tr>`;
}

// View history modal
let fileCache = {};
onValue(filesRef, (snapshot) => {
  fileCache = {};
  snapshot.forEach(child => {
    fileCache[child.key] = child.val();
  });
});

filesTableBody.addEventListener('click', e => {
  const id = e.target.dataset.id;
  const file = fileCache[id];
  if (file?.history) {
    historyContent.innerHTML = file.history.map(h => `
      <div style="border-bottom:1px solid #ccc; padding:6px 0;">
        <b>Date:</b> ${h.date}<br>
        <b>Status:</b> ${h.status}<br>
        <b>Sent By:</b> ${h.sentBy}<br>
        <b>Given To:</b> ${h.givenTo}<br>
        <b>Remarks:</b> ${h.remarks || ''}
      </div>
    `).join('');
    historyModal.style.display = 'block';
  }
});

closeHistoryModal.onclick = () => historyModal.style.display = 'none';
