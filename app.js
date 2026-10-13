
const STORAGE_KEY = "lifeOS_data";

const SUPABASE_URL = "https://udkzuyzxvjokrpvxmzem.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1MV1Wrg5VmW2z5W_MCdoIQ_9UKn-wZx";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const defaultTasks = [
  { title: "Complete morning routine", category: "PERSONAL" },
  { title: "Train or work on mobility", category: "FITNESS" },
  { title: "Practise acting or write", category: "MY CRAFT" }
];

// Weekdays: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
// Edit these schedules whenever your routine changes.
const habits = [
  { id: "mobility", title: "Mobility or stretching", category: "WELLBEING", days: [0, 1, 2, 3, 4, 5, 6] },
  { id: "reading", title: "Read for at least 10 minutes", category: "PERSONAL", days: [0, 1, 2, 3, 4, 5, 6] },
  { id: "craft", title: "Acting practice or screenwriting", category: "MY CRAFT", days: [0, 1, 2, 3, 4, 5, 6] },
  { id: "strength", title: "Strength training", category: "FITNESS", days: [1, 2, 4, 6] }
];

const $ = id => document.getElementById(id);

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeDefaultTasks() {
  return defaultTasks.map(task => ({
    id: appState.nextTaskId++,
    title: task.title,
    category: task.category,
    done: false
  }));
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error("Could not load Life OS data:", error);
    return null;
  }
}

const savedState = loadState();


const appState = {
  nextTaskId: Math.max(Number(savedState?.nextTaskId) || 4, 4),
  days: savedState?.days && typeof savedState.days === "object"
    ? savedState.days
    : {},
  goals: Array.isArray(savedState?.goals) ? savedState.goals : []
};


// Migrate tasks from your previous working version.
// This preserves your current tasks and side-quest state for today.
const todayKey = getDateKey();

if (!appState.days[todayKey]) {
  const oldTasks = Array.isArray(savedState?.tasks)
    ? savedState.tasks
    : null;

  appState.days[todayKey] = {
    tasks: oldTasks || makeDefaultTasks(),
    habitDone: {},
    questDone: savedState?.questDone === true
  };

  if (oldTasks) {
    const highestId = oldTasks.reduce(
      (highest, task) => Math.max(highest, Number(task.id) || 0),
      0
    );
    appState.nextTaskId = Math.max(appState.nextTaskId, highestId + 1);
  }
}

let activeDate = todayKey;

function getDayRecord(dateKey = activeDate) {
  if (!appState.days[dateKey]) {
    appState.days[dateKey] = {
      tasks: makeDefaultTasks(),
      habitDone: {},
      questDone: false
    };
  }

  const record = appState.days[dateKey];

  if (!Array.isArray(record.tasks)) record.tasks = [];
  if (!record.habitDone || typeof record.habitDone !== "object") {
    record.habitDone = {};
  }
  if (typeof record.questDone !== "boolean") record.questDone = false;

  return record;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (error) {
    console.error("Could not save Life OS data:", error);
  }
}

function getDueHabits(dateKey = activeDate) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.getDay();

  return habits.filter(habit => habit.days.includes(weekday));
}

function renderTasks() {
  const record = getDayRecord();
  const list = $("task-list");
  list.replaceChildren();

  record.tasks.forEach(task => {
    const row = document.createElement("div");
    row.className = `task-row${task.done ? " done" : ""}`;

    const check = document.createElement("button");
    check.className = "task-check";
    check.textContent = task.done ? "✓" : "";
    check.setAttribute("aria-label", task.done ? "Mark incomplete" : "Mark complete");
    check.setAttribute("aria-pressed", String(task.done));

    check.addEventListener("click", () => {
      task.done = !task.done;
      saveState();
      renderTasks();
      renderScore();
    });

    const name = document.createElement("span");
    name.className = "task-name";
    name.textContent = task.title;

    const category = document.createElement("span");
    category.className = "task-category";
    category.textContent = task.category;

    const remove = document.createElement("button");
    remove.className = "delete-task";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Delete ${task.title}`);

    remove.addEventListener("click", () => {
      record.tasks = record.tasks.filter(item => item.id !== task.id);
      saveState();
      renderTasks();
      renderScore();
    });

    row.append(check, name, category, remove);
    list.append(row);
  });
}

function renderHabits() {
  const record = getDayRecord();
  const list = $("habit-list");
  const dueHabits = getDueHabits();

  list.replaceChildren();

  dueHabits.forEach(habit => {
    const done = record.habitDone[habit.id] === true;

    const row = document.createElement("div");
    row.className = `habit-row${done ? " done" : ""}`;

    const check = document.createElement("button");
    check.className = "task-check habit-check";
    check.textContent = done ? "✓" : "";
    check.setAttribute("aria-label", done ? "Mark habit incomplete" : "Complete habit");
    check.setAttribute("aria-pressed", String(done));

    check.addEventListener("click", () => {
      record.habitDone[habit.id] = !record.habitDone[habit.id];
      saveState();
      renderHabits();
      renderScore();
    });

    const details = document.createElement("div");
    details.className = "habit-details";

    const title = document.createElement("span");
    title.className = "habit-name";
    title.textContent = habit.title;

    const category = document.createElement("span");
    category.className = "habit-category";
    category.textContent = habit.category;

    details.append(title, category);
    row.append(check, details);
    list.append(row);
  });

  const completed = dueHabits.filter(
    habit => record.habitDone[habit.id] === true
  ).length;

  $("habits-count").textContent = `${completed} / ${dueHabits.length} COMPLETE`;

  const today = new Date();
  const dateForActive = activeDate.split("-").map(Number);
  const isToday = activeDate === getDateKey(today);

  $("habit-note").textContent = dueHabits.length === 0
    ? "No habits scheduled for this day."
    : isToday
      ? "Your scheduled habits for today. Progress saves automatically."
      : `Historical view: ${activeDate}. Changes here update that day's record.`;
}

function renderScore() {
  const record = getDayRecord();
  const dueHabits = getDueHabits();

  const completedTasks = record.tasks.filter(task => task.done).length;
  const completedHabits = dueHabits.filter(
    habit => record.habitDone[habit.id] === true
  ).length;

  const completed = completedTasks + completedHabits;
  const total = record.tasks.length + dueHabits.length;
  const percent = total ? Math.round(completed / total * 100) : 0;

  $("completion-count").textContent = `${completed} / ${total}`;
  $("completion-percent").textContent = `${percent}%`;

  $("progress-ring").style.background =
    `conic-gradient(var(--accent) ${percent}%, #33342c ${percent}%)`;

  $("completion-message").textContent =
    total === 0 ? "Add a task or complete a habit to get started." :
    percent === 100 ? "Everything completed. Excellent work." :
    completed === 0 ? "Start with one small win." :
    "You're making progress. Keep going.";
}

function updateQuestUI() {
  const record = getDayRecord();
  const button = $("complete-quest");

  button.classList.toggle("completed", record.questDone);
  button.textContent = record.questDone ? "✓" : "○";
  button.setAttribute("aria-pressed", String(record.questDone));

  $("quest-title").textContent = record.questDone
    ? "Side quest completed."
    : "Create something before you consume.";

  $("quest-description").textContent = record.questDone
    ? "You showed up for yourself today. Make a note of what you created."
    : "Spend 15 minutes writing, rehearsing or developing an original idea before opening social media.";
}

function renderDate() {
  const [year, month, day] = activeDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  $("today-date").textContent = new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getDayScore(dateKey) {
  const record = appState.days[dateKey];
  if (!record) return { percent: 0, completed: 0, total: 0, recorded: false };

  const tasks = Array.isArray(record.tasks) ? record.tasks : [];
  const due = getDueHabits(dateKey);
  const completedTasks = tasks.filter(task => task.done).length;
  const completedHabits = due.filter(habit =>
    record.habitDone?.[habit.id] === true
  ).length;
  const total = tasks.length + due.length;
  const completed = completedTasks + completedHabits;

  return {
    percent: total ? Math.round(completed / total * 100) : 0,
    completed,
    total,
    recorded: true,
    completedTasks,
    completedHabits,
    totalHabits: due.length
  };
}

function shiftDate(dateKey, amount) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return getDateKey(date);
}

function formatShortDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short"
  }).format(new Date(year, month - 1, day));
}

function renderWeeklyProgress() {
  const today = getDateKey();
  const week = [];

  // Current day plus the six preceding days.
  for (let offset = 6; offset >= 0; offset--) {
    const dateKey = shiftDate(today, -offset);
    const score = getDayScore(dateKey);
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    week.push({
      dateKey,
      score,
      label: new Intl.DateTimeFormat("en", { weekday: "short" })
        .format(date)
    });
  }

  const recordedDays = week.filter(day => day.score.recorded);
  const average = recordedDays.length
    ? Math.round(
        recordedDays.reduce((sum, day) => sum + day.score.percent, 0)
        / recordedDays.length
      )
    : 0;

  const totalTasks = recordedDays.reduce(
    (sum, day) => sum + (day.score.completedTasks || 0), 0
  );
  const doneHabits = recordedDays.reduce(
    (sum, day) => sum + (day.score.completedHabits || 0), 0
  );
  const dueHabits = recordedDays.reduce(
    (sum, day) => sum + (day.score.totalHabits || 0), 0
  );

  $("week-average").textContent = `${average}%`;
  $("week-tasks").textContent = String(totalTasks);
  $("week-habits").textContent = `${doneHabits} / ${dueHabits}`;

  const chart = $("weekly-chart");
  chart.replaceChildren();

  week.forEach(day => {
    const column = document.createElement("div");
    column.className = "weekly-column";

    const value = document.createElement("span");
    value.className = "weekly-value";
    value.textContent = day.score.recorded ? `${day.score.percent}%` : "—";

    const track = document.createElement("div");
    track.className = "weekly-bar-track";

    const bar = document.createElement("div");
    bar.className = "weekly-bar";
    bar.style.height = `${day.score.recorded ? day.score.percent : 0}%`;
    if (day.dateKey === today) bar.classList.add("today-bar");
    track.append(bar);

    const label = document.createElement("span");
    label.className = "weekly-label";
    label.textContent = day.label;

    column.append(value, track, label);
    chart.append(column);
  });
}

function getHabitStreak(habit) {
  const today = getDateKey();
  const todayRecord = appState.days[today];
  const todayIsDue = getDueHabits(today).some(item => item.id === habit.id);
  const todayIsDone = todayRecord?.habitDone?.[habit.id] === true;

  // An unfinished habit due today does not break the streak until the day ends.
  let current = 0;
  let cursor = today;

  if (todayIsDue && !todayIsDone) cursor = shiftDate(today, -1);

  for (let i = 0; i < 3660; i++) {
    if (getDueHabits(cursor).some(item => item.id === habit.id)) {
      if (appState.days[cursor]?.habitDone?.[habit.id] !== true) break;
      current++;
    }
    cursor = shiftDate(cursor, -1);
  }

  const savedDates = Object.keys(appState.days).sort();
  let best = 0;
  let run = 0;

  if (savedDates.length) {
    let date = savedDates[0];

    for (let i = 0; i < 3660 && date <= today; i++) {
      if (getDueHabits(date).some(item => item.id === habit.id)) {
        if (appState.days[date]?.habitDone?.[habit.id] === true) {
          run++;
          best = Math.max(best, run);
        } else {
          run = 0;
        }
      }
      date = shiftDate(date, 1);
    }
  }

  return { current, best };
}

function renderStreaks() {
  const list = $("streak-list");
  list.replaceChildren();

  habits.forEach(habit => {
    const streak = getHabitStreak(habit);

    const row = document.createElement("div");
    row.className = "streak-row";

    const details = document.createElement("div");
    details.className = "streak-details";

    const name = document.createElement("strong");
    name.textContent = habit.title;

    const schedule = document.createElement("span");
    schedule.className = "streak-schedule";
    schedule.textContent = habit.days.length === 7
      ? "Every day"
      : habit.days.map(day =>
          ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]
        ).join(" · ");

    details.append(name, schedule);

    const numbers = document.createElement("div");
    numbers.className = "streak-numbers";

    const current = document.createElement("strong");
    current.textContent = `🔥 ${streak.current}`;

    const best = document.createElement("span");
    best.textContent = `Best ${streak.best}`;

    numbers.append(current, best);
    row.append(details, numbers);
    list.append(row);
  });
}

function renderGoals() {
  const list = $("goal-list");
  list.replaceChildren();

  if (appState.goals.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Your goals start here. Create one above.";
    list.append(empty);
    return;
  }

  appState.goals.forEach(goal => {
    const card = document.createElement("div");
    card.className = "goal-card";

    const top = document.createElement("div");
    top.className = "goal-card-top";

    const details = document.createElement("div");
    details.className = "goal-details";

    const title = document.createElement("h3");
    title.textContent = goal.title;

    const description = document.createElement("p");
    description.textContent = goal.description || "";

    details.append(title);
    if (goal.description) details.append(description);

    const remove = document.createElement("button");
    remove.className = "delete-task";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Delete goal ${goal.title}`);
    remove.addEventListener("click", () => {
      appState.goals = appState.goals.filter(item => item.id !== goal.id);
      saveState();
      renderGoals();
    });

    top.append(details, remove);

    const current = Math.max(0, Number(goal.current) || 0);
    const target = Math.max(1, Number(goal.target) || 1);
    const percent = Math.min(100, Math.round(current / target * 100));

    const numbers = document.createElement("div");
    numbers.className = "goal-numbers";

    const progressText = document.createElement("span");
    progressText.textContent = `${current} / ${target} ${goal.unit}`;

    const percentText = document.createElement("span");
    percentText.textContent = `${percent}%`;

    numbers.append(progressText, percentText);

    const track = document.createElement("div");
    track.className = "goal-progress-track";

    const bar = document.createElement("div");
    bar.className = "goal-progress-bar";
    bar.style.width = `${percent}%`;
    track.append(bar);

    const actions = document.createElement("div");
    actions.className = "goal-actions";

    const addProgress = document.createElement("button");
    addProgress.className = "primary-button";
    addProgress.type = "button";
    addProgress.textContent = `+1 ${goal.unit.replace(/s$/, "")}`;
    addProgress.disabled = current >= target;

    addProgress.addEventListener("click", () => {
      goal.current = Math.min(target, current + 1);
      saveState();
      renderGoals();
    });

    const deadline = document.createElement("span");
    deadline.className = "goal-deadline";
    if (goal.deadline) {
      const remaining = Math.ceil(
        (new Date(`${goal.deadline}T00:00:00`) -
         new Date(`${getDateKey()}T00:00:00`)) / 86400000
      );
      deadline.textContent = remaining < 0
        ? `Deadline passed · ${goal.deadline}`
        : remaining === 0
          ? "Due today"
          : `Due ${goal.deadline} · ${remaining} days left`;
      if (remaining < 0 && current < target) deadline.classList.add("overdue");
    } else {
      deadline.textContent = "No deadline";
    }

    actions.append(addProgress, deadline);

    const milestoneHeading = document.createElement("h4");
    milestoneHeading.className = "milestone-heading";
    milestoneHeading.textContent = "Milestones";

    const milestoneList = document.createElement("div");
    milestoneList.className = "milestone-list";

    (goal.milestones || []).forEach((milestone, index) => {
      const row = document.createElement("label");
      row.className = "milestone-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = milestone.done === true;
      checkbox.addEventListener("change", () => {
        milestone.done = checkbox.checked;
        saveState();
        renderGoals();
      });

      const text = document.createElement("span");
      text.textContent = milestone.title;
      if (milestone.done) text.classList.add("milestone-done");

      const deleteMilestone = document.createElement("button");
      deleteMilestone.type = "button";
      deleteMilestone.className = "delete-task";
      deleteMilestone.textContent = "×";
      deleteMilestone.setAttribute("aria-label", "Delete milestone");
      deleteMilestone.addEventListener("click", event => {
        event.preventDefault();
        goal.milestones.splice(index, 1);
        saveState();
        renderGoals();
      });

      row.append(checkbox, text, deleteMilestone);
      milestoneList.append(row);
    });

    const milestoneForm = document.createElement("form");
    milestoneForm.className = "milestone-form";

    const milestoneInput = document.createElement("input");
    milestoneInput.type = "text";
    milestoneInput.maxLength = 100;
    milestoneInput.placeholder = "Add a milestone...";
    milestoneInput.setAttribute("aria-label", "New milestone");
    milestoneInput.required = true;

    const milestoneButton = document.createElement("button");
    milestoneButton.type = "submit";
    milestoneButton.className = "text-button";
    milestoneButton.textContent = "+ Add";

    milestoneForm.append(milestoneInput, milestoneButton);
    milestoneForm.addEventListener("submit", event => {
      event.preventDefault();
      const text = milestoneInput.value.trim();
      if (!text) return;

      if (!Array.isArray(goal.milestones)) goal.milestones = [];
      goal.milestones.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: text,
        done: false
      });
      saveState();
      renderGoals();
    });

    const milestoneCount = document.createElement("p");
    milestoneCount.className = "progress-footnote";
    const milestones = goal.milestones || [];
    const milestonesDone = milestones.filter(item => item.done).length;
    milestoneCount.textContent =
      `${milestonesDone} / ${milestones.length} milestones complete`;

    card.append(top, numbers, track, actions);
    card.append(milestoneHeading, milestoneList, milestoneForm, milestoneCount);
    list.append(card);
  });
}

function renderHistory() {
  const list = $("history-list");
  list.replaceChildren();

  const dates = Object.keys(appState.days)
    .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 30);

  if (!dates.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Your recorded days will appear here.";
    list.append(empty);
    return;
  }

  dates.forEach(dateKey => {
    const score = getDayScore(dateKey);
    const record = appState.days[dateKey];

    const row = document.createElement("div");
    row.className = "history-row";

    const date = document.createElement("div");
    date.className = "history-date";

    const dateTitle = document.createElement("strong");
    dateTitle.textContent = dateKey === getDateKey()
      ? "Today"
      : formatShortDate(dateKey);

    const dateSubtitle = document.createElement("span");
    dateSubtitle.textContent = dateKey;

    date.append(dateTitle, dateSubtitle);

    const summary = document.createElement("div");
    summary.className = "history-summary";

    const percent = document.createElement("strong");
    percent.textContent = `${score.percent}%`;

    const detail = document.createElement("span");
    detail.textContent =
      `${score.completed} / ${score.total} tasks and due habits`;

    summary.append(percent, detail);

    const quest = document.createElement("span");
    quest.className = "history-quest";
    quest.textContent = record.questDone ? "Quest ✓" : "";

    row.append(date, summary, quest);
    list.append(row);
  });
}

function renderProgress() {
  renderWeeklyProgress();
  renderStreaks();
  renderGoals();
  renderHistory();
}

$("goal-form").addEventListener("submit", event => {
  event.preventDefault();

  const title = $("goal-title").value.trim();
  const description = $("goal-description").value.trim();
  const target = Number($("goal-target").value);
  const unit = $("goal-unit").value.trim();
  const deadline = $("goal-deadline").value;

  if (!title || !Number.isFinite(target) || target < 1 || !unit) return;

  appState.goals.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    description,
    target,
    current: 0,
    unit,
    deadline,
    milestones: []
  });

  saveState();
  $("goal-form").reset();
  $("goal-target").value = 10;
  $("goal-unit").value = "sessions";
  renderGoals();
});


function renderToday() {
  renderDate();
  renderTasks();
  renderHabits();
  renderScore();
  updateQuestUI();
}

function activateCurrentDate() {
  const currentDate = getDateKey();

  if (currentDate !== activeDate) {
    activeDate = currentDate;
    getDayRecord();
    saveState();
    renderToday();
  }
}

$("add-task").addEventListener("click", () => {
  $("task-form").classList.remove("hidden");
  $("task-input").focus();
});

$("cancel-task").addEventListener("click", () => {
  $("task-form").classList.add("hidden");
  $("task-input").value = "";
});

$("task-form").addEventListener("submit", event => {
  event.preventDefault();

  const input = $("task-input");
  const title = input.value.trim();

  if (!title) return;

  getDayRecord().tasks.push({
    id: appState.nextTaskId++,
    title,
    category: "PERSONAL",
    done: false
  });

  input.value = "";
  $("task-form").classList.add("hidden");

  saveState();
  renderTasks();
  renderScore();
});

$("complete-quest").addEventListener("click", () => {
  const record = getDayRecord();
  record.questDone = !record.questDone;
  saveState();
  updateQuestUI();
});

const pages = ["today", "progress", "craft", "briefing", "library"];

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    const selected = button.dataset.page;

    pages.forEach(page => {
      $(`page-${page}`).classList.toggle("hidden", page !== selected);
    });

    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    $("section-name").textContent =
      selected === "craft" ? "MY CRAFT" : selected.toUpperCase();
      if (selected === "progress") {
  renderProgress();
}
  });
});

// Refresh the day when the date changes while the page is open,
// and when the user returns to the browser.
window.addEventListener("focus", activateCurrentDate);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) activateCurrentDate();
});
window.setInterval(activateCurrentDate, 30000);

renderToday();
renderProgress();
/* Life OS: account authentication */
const authScreen = document.getElementById("auth-screen");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const authSubmit = document.getElementById("auth-submit");
const authToggle = document.getElementById("auth-toggle");
const authMessage = document.getElementById("auth-message");

let authMode = "signin";
let authReady = false;

authToggle.addEventListener("click", () => {
  authMode = authMode === "signin" ? "signup" : "signin";

  authSubmit.textContent =
    authMode === "signup" ? "Create account" : "Sign in";

  authToggle.textContent =
    authMode === "signup"
      ? "Already have an account? Sign in"
      : "New to Life OS? Create an account";

  authPassword.setAttribute(
    "autocomplete",
    authMode === "signup" ? "new-password" : "current-password"
  );

  authMessage.textContent = "";
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  authSubmit.disabled = true;
  authMessage.textContent = "Connecting securely...";

  const email = authEmail.value.trim();
  const password = authPassword.value;

  try {
    if (authMode === "signup") {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
      });

      if (error) throw error;

      if (data.session) {
        authMessage.textContent = "Account created. You're signed in.";
      } else {
        authMessage.textContent =
          "Account created. Check your email for a confirmation link, then sign in.";
      }
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      authMessage.textContent = "Signed in successfully.";
    }
  } catch (error) {
    authMessage.textContent = error.message || "Something went wrong.";
  } finally {
    authSubmit.disabled = false;
  }
});

async function updateAuthScreen(session) {
  if (session) {
    authScreen.classList.add("auth-hidden");
  } else {
    authScreen.classList.remove("auth-hidden");
  }
}

supabaseClient.auth.onAuthStateChange((_event, session) => {
  updateAuthScreen(session);
  authReady = true;
});

(async () => {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    authMessage.textContent = error.message;
    return;
  }

  await updateAuthScreen(data.session);
  authReady = true;
})();
