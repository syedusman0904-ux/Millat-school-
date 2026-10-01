const CLASSES = ['Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7','Class 8'];
const STORE_KEY = 'greenwood_attendance_v1';

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.error('Storage read failed', e); }
  return { roster: {}, records: {} };
}

function saveData() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
  catch (e) { console.error('Storage write failed', e); }
}

let data = loadData();
CLASSES.forEach(c => { if (!data.roster[c]) data.roster[c] = []; });

let currentClass = CLASSES[0];
let currentDate = todayStr();

function recordKey(cls, date) { return cls + '|' + date; }

function getRecord(cls, date) {
  const key = recordKey(cls, date);
  if (!data.records[key]) data.records[key] = {};
  return data.records[key];
}

function showView(view) {
  document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelectorAll('nav.tabs button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  if (view === 'home') renderHome();
}

function goToClass(cls) {
  currentClass = cls;
  showView('attendance');
  renderAttendance();
}

function onDateChange() {
  currentDate = document.getElementById('dateInput').value || todayStr();
  renderAttendance();
}

function selectClass(cls) {
  currentClass = cls;
  renderAttendance();
}

function addStudent() {
  const input = document.getElementById('studentInput');
  const name = input.value.trim();
  const errorDiv = document.getElementById('error');

  if (!name) {
    errorDiv.textContent = 'Enter a student name.';
    errorDiv.style.display = 'block';
    return;
  }
  const roster = data.roster[currentClass];
  if (roster.some(n => n.toLowerCase() === name.toLowerCase())) {
    errorDiv.textContent = 'Already on this class roster.';
    errorDiv.style.display = 'block';
    return;
  }
  errorDiv.style.display = 'none';
  roster.push(name);
  const rec = getRecord(currentClass, currentDate);
  rec[name] = 'unmarked';
  input.value = '';
  saveData();
  renderAttendance();
}

function markAttendance(name, status) {
  const rec = getRecord(currentClass, currentDate);
  rec[name] = (rec[name] === status) ? 'unmarked' : status;
  saveData();
  renderAttendance();
}

function removeStudent(name) {
  data.roster[currentClass] = data.roster[currentClass].filter(n => n !== name);
  Object.keys(data.records).forEach(key => {
    if (key.startsWith(currentClass + '|')) delete data.records[key][name];
  });
  saveData();
  renderAttendance();
}

function resetDay() {
  if (!confirm('Reset attendance marks for ' + currentClass + ' on ' + currentDate + '?')) return;
  const rec = getRecord(currentClass, currentDate);
  Object.keys(rec).forEach(name => rec[name] = 'unmarked');
  saveData();
  renderAttendance();
}

function saveDay() {
  saveData();
  const toast = document.getElementById('toast');
  toast.textContent = 'Saved ' + currentClass + ' — ' + currentDate;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function downloadReport() {
  const rec = getRecord(currentClass, currentDate);
  let csv = 'Class,Date,Student,Status\n';
  data.roster[currentClass].forEach(name => {
    csv += `${currentClass},${currentDate},${name},${rec[name] || 'unmarked'}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_${currentClass.replace(' ','_')}_${currentDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function classCounts(cls, date) {
  const roster = data.roster[cls];
  const rec = getRecord(cls, date);
  let present = 0, absent = 0, unmarked = 0;
  roster.forEach(name => {
    const s = rec[name] || 'unmarked';
    if (s === 'present') present++;
    else if (s === 'absent') absent++;
    else unmarked++;
  });
  return { present, absent, unmarked, total: roster.length };
}

function renderHome() {
  const date = todayStr();
  const grid = document.getElementById('classGrid');
  grid.innerHTML = '';
  let totalP = 0, totalA = 0, totalU = 0;
  CLASSES.forEach(cls => {
    const c = classCounts(cls, date);
    totalP += c.present; totalA += c.absent; totalU += c.unmarked;
    const card = document.createElement('button');
    card.className = 'class-card';
    card.onclick = () => goToClass(cls);
    card.innerHTML = `
      <div class="name">${cls}</div>
      <div class="counts">
        <span><span class="dot" style="background:var(--present)"></span><b>${c.present}</b> in</span>
        <span><span class="dot" style="background:var(--absent)"></span><b>${c.absent}</b> out</span>
        <span>${c.total} total</span>
      </div>`;
    grid.appendChild(card);
  });
  document.getElementById('homePresent').textContent = totalP;
  document.getElementById('homeAbsent').textContent = totalA;
  document.getElementById('homeUnmarked').textContent = totalU;
  document.getElementById('todayLabel').textContent = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function renderAttendance() {
  document.getElementById('dateInput').value = currentDate;

  const strip = document.getElementById('classStrip');
  strip.innerHTML = '';
  CLASSES.forEach(cls => {
    const chip = document.createElement('button');
    chip.className = 'class-chip' + (cls === currentClass ? ' active' : '');
    chip.textContent = cls;
    chip.onclick = () => selectClass(cls);
    strip.appendChild(chip);
  });

  const roster = data.roster[currentClass];
  const rec = getRecord(currentClass, currentDate);
  const list = document.getElementById('studentList');

  if (roster.length === 0) {
    list.innerHTML = '<div class="empty">No students on this class roster yet — add one above.</div>';
  } else {
    list.innerHTML = '';
    roster.forEach(name => {
      const status = rec[name] || 'unmarked';
      const row = document.createElement('div');
      row.className = 'student-row';
      row.innerHTML = `
        <span class="student-name">${name}</span>
        <button class="mark present ${status === 'present' ? 'on' : ''}" onclick="markAttendance('${name.replace(/'/g,"\\'")}','present')">Present</button>
        <button class="mark absent ${status === 'absent' ? 'on' : ''}" onclick="markAttendance('${name.replace(/'/g,"\\'")}','absent')">Absent</button>
        <button class="remove" title="Remove student" onclick="removeStudent('${name.replace(/'/g,"\\'")}')">&times;</button>`;
      list.appendChild(row);
    });
  }

  const c = classCounts(currentClass, currentDate);
  document.getElementById('presentCount').textContent = c.present;
  document.getElementById('absentCount').textContent = c.absent;
  document.getElementById('unmarkedCount').textContent = c.unmarked;
  document.getElementById('error').style.display = 'none';
}

document.getElementById('dateInput').value = currentDate;
renderHome();
renderAttendance();
