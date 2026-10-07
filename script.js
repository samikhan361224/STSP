let tasks = [];
const $ = (id) => document.getElementById(id);
const priorityRank = { High: 3, Medium: 2, Low: 1 };

// ---------- Storage ----------
function saveTasks() {
  localStorage.setItem("studyTasks", JSON.stringify(tasks));
}

function loadTasks() {
  try {
    tasks = JSON.parse(localStorage.getItem("studyTasks")) || [];
  } catch (e) {
    tasks = [];
  }
}

// ---------- Helpers ----------
function todayString() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  $("toastBox").appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ---------- Theme ----------
function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  localStorage.setItem("studyTheme", next);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("themeToggle").textContent = theme === "dark" ? "☀️" : "🌙";
}

// ---------- Add / Edit / Delete / Toggle ----------
function validateForm() {
  let valid = true;
  const title = $("title").value.trim();
  const editingId = Number($("taskId").value);
  $("titleError").textContent = "";
  $("subjectError").textContent = "";
  $("deadlineError").textContent = "";

  if (!title) {
    $("titleError").textContent = "Enter a task title.";
    valid = false;
  } else if (tasks.some((t) => t.title.toLowerCase() === title.toLowerCase() && t.id !== editingId)) {
    $("titleError").textContent = "A task with this title already exists.";
    valid = false;
  }
  if (!$("subject").value.trim()) {
    $("subjectError").textContent = "Enter a subject.";
    valid = false;
  }
  if (!$("deadline").value) {
    $("deadlineError").textContent = "Pick a deadline.";
    valid = false;
  }
  return valid;
}

function readForm() {
  return {
    title: $("title").value.trim(),
    subject: $("subject").value.trim(),
    priority: $("priority").value,
    deadline: $("deadline").value,
    description: $("description").value.trim(),
  };
}

function addTask() {
  tasks.push({ id: Date.now(), ...readForm(), completed: false });
  saveTasks();
  showToast("Task added successfully ✓");
}

function updateTask() {
  const id = Number($("taskId").value);
  const task = tasks.find((t) => t.id === id);
  Object.assign(task, readForm());
  saveTasks();
  showToast("Task edited successfully ✓");
}

function deleteTask(id) {
  if (!confirm("Delete this task?")) return;
  const card = document.querySelector(`[data-id="${id}"]`);
  if (card) card.classList.add("removing");
  setTimeout(() => {
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks();
    refresh();
    showToast("Task deleted ✓");
  }, 250);
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  task.completed = !task.completed;
  saveTasks();
  refresh();
  showToast(task.completed ? "Task completed ✓" : "Task marked as pending");
}

function startEdit(id) {
  const t = tasks.find((task) => task.id === id);
  $("taskId").value = t.id;
  $("title").value = t.title;
  $("subject").value = t.subject;
  $("priority").value = t.priority;
  $("deadline").value = t.deadline;
  $("description").value = t.description;
  $("submitBtn").textContent = "Save Changes";
  $("cancelEdit").hidden = false;
  showView("tasks");
  $("title").focus();
}

function resetForm() {
  $("taskForm").reset();
  $("taskId").value = "";
  $("priority").value = "Medium";
  $("submitBtn").textContent = "Add Task";
  $("cancelEdit").hidden = true;
}

// ---------- Search / Filter / Sort ----------
function searchTasks(list) {
  const q = $("searchInput").value.trim().toLowerCase();
  if (!q) return list;
  return list.filter((t) =>
    [t.title, t.subject, t.description].some((text) => text.toLowerCase().includes(q))
  );
}

function filterTasks(list) {
  const f = $("filterSelect").value;
  if (f === "completed") return list.filter((t) => t.completed);
  if (f === "pending") return list.filter((t) => !t.completed);
  if (priorityRank[f]) return list.filter((t) => t.priority === f);
  return list;
}

function sortTasks(list) {
  const s = $("sortSelect").value;
  const sorted = [...list];
  if (s === "newest") sorted.sort((a, b) => b.id - a.id);
  if (s === "oldest") sorted.sort((a, b) => a.id - b.id);
  if (s === "deadline") sorted.sort((a, b) => a.deadline.localeCompare(b.deadline));
  if (s === "priority") sorted.sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority]);
  return sorted;
}

// ---------- Display ----------
function taskCardHTML(t) {
  const today = todayString();
  const overdue = !t.completed && t.deadline < today;
  const dueToday = !t.completed && t.deadline === today;
  const cls = ["task", t.priority, t.completed ? "done" : "", overdue ? "overdue" : ""].join(" ");
  return `
    <article class="${cls}" data-id="${t.id}">
      <div class="badges">
        <span class="badge ${t.priority}">${t.priority} priority</span>
        <span class="badge">${escapeHTML(t.subject)}</span>
        ${t.completed ? '<span class="badge done">Completed ✓</span>' : ""}
        ${overdue ? '<span class="badge overdue">Overdue</span>' : ""}
        ${dueToday ? '<span class="badge today">Due today</span>' : ""}
      </div>
      <h3>${escapeHTML(t.title)}</h3>
      <p>📅 ${t.deadline}</p>
      ${t.description ? `<p>${escapeHTML(t.description)}</p>` : ""}
      <p>Status: ${t.completed ? "Completed" : "Pending"}</p>
      <div class="task-actions">
        <button class="btn" data-action="toggle">${t.completed ? "Undo" : "Complete"}</button>
        <button class="btn" data-action="edit">Edit</button>
        <button class="btn danger" data-action="delete">Delete</button>
      </div>
    </article>`;
}

function emptyHTML(icon, text) {
  return `<div class="empty"><span class="icon">${icon}</span>${text}</div>`;
}

function displayTasks() {
  const visible = sortTasks(filterTasks(searchTasks(tasks)));
  if (tasks.length === 0) {
    $("taskList").innerHTML = emptyHTML("📚", "No tasks yet. Add your first study task! 📚");
  } else if (visible.length === 0) {
    $("taskList").innerHTML = emptyHTML("🔍", "No tasks match your search or filter.");
  } else {
    $("taskList").innerHTML = visible.map(taskCardHTML).join("");
  }

  const todays = tasks.filter((t) => t.deadline === todayString());
  $("todayTasks").innerHTML = todays.length
    ? todays.map(taskCardHTML).join("")
    : emptyHTML("🎉", "Nothing due today.");
}

// ---------- Statistics ----------
function getStats() {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  return {
    total,
    completed,
    pending: total - completed,
    percent: total ? Math.round((completed / total) * 100) : 0,
    high: tasks.filter((t) => t.priority === "High").length,
  };
}

function statCard(num, label) {
  return `<div class="stat"><div class="num">${num}</div><div class="label">${label}</div></div>`;
}

function updateStatistics() {
  const s = getStats();
  $("dashStats").innerHTML =
    statCard(s.total, "Total Tasks") + statCard(s.completed, "Completed") +
    statCard(s.pending, "Pending") + statCard(s.percent + "%", "Completion");

  // Today's progress bar
  const todays = tasks.filter((t) => t.deadline === todayString());
  const doneToday = todays.filter((t) => t.completed).length;
  const todayPct = todays.length ? Math.round((doneToday / todays.length) * 100) : 0;
  $("todayPercent").textContent = todayPct + "%";
  $("todayBar").style.width = todayPct + "%";

  $("statsCards").innerHTML =
    statCard(s.total, "Total Tasks") + statCard(s.completed, "Completed") +
    statCard(s.pending, "Pending") + statCard(s.percent + "%", "Completion") +
    statCard(s.high, "High-priority tasks");

  // Simple bar chart built from divs
  const bars = [["Total", s.total], ["Done", s.completed], ["Pending", s.pending], ["High", s.high]];
  const max = Math.max(1, s.total);
  $("chart").innerHTML = bars.map(([label, value]) =>
    `<div class="col"><strong>${value}</strong><div class="b" style="height:${(value / max) * 80}%"></div><span>${label}</span></div>`
  ).join("");
}

// ---------- Navigation ----------
function showView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === name));
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
}

function refresh() {
  displayTasks();
  updateStatistics();
}

function setGreeting() {
  const hour = new Date().getHours();
  const word = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  $("greeting").textContent = `Good ${word}, Student 👋`;
  $("todayDate").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

// ---------- Events ----------
function handleCardClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = Number(btn.closest(".task").dataset.id);
  const action = btn.dataset.action;
  if (action === "toggle") toggleTask(id);
  if (action === "edit") startEdit(id);
  if (action === "delete") deleteTask(id);
}

function init() {
  loadTasks();
  applyTheme(localStorage.getItem("studyTheme") || "light");
  setGreeting();
  refresh();

  $("taskForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    $("taskId").value ? updateTask() : addTask();
    resetForm();
    refresh();
  });
  $("cancelEdit").addEventListener("click", resetForm);
  ["searchInput", "filterSelect", "sortSelect"].forEach((id) =>
    $(id).addEventListener("input", displayTasks)
  );
  $("taskList").addEventListener("click", handleCardClick);
  $("todayTasks").addEventListener("click", handleCardClick);
  $("themeToggle").addEventListener("click", toggleTheme);
  $("themeBtn2").addEventListener("click", toggleTheme);
  $("nav").addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-btn");
    if (btn) showView(btn.dataset.view);
  });
  $("clearAll").addEventListener("click", () => {
    if (!tasks.length || !confirm("Delete all tasks? This can't be undone.")) return;
    tasks = [];
    saveTasks();
    refresh();
    showToast("All tasks deleted ✓");
  });
}

init();
