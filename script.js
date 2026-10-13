/**
 * DAYNOTE — Minimal Lavender Productivity Web App
 * Vanilla JavaScript logic: LocalStorage persistence, tasks, monthly calendar, and notes.
 */

(function () {
  'use strict';

  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================
  const STORAGE_KEYS = {
    TASKS: 'daynote_tasks',
    NOTES: 'daynote_notes',
    ACTIVE_TAB: 'daynote_active_tab',
    THEME: 'daynote_theme'
  };

  const state = {
    tasks: [],
    notes: [],
    activeTab: 'tasks',
    taskFilter: 'all',
    theme: 'light',
    activeNoteId: null,
    searchQuery: '',
    calendar: {
      year: new Date().getFullYear(),
      month: new Date().getMonth(), // 0-indexed
      selectedDate: formatDateToYMD(new Date())
    }
  };

  let saveNoteTimeout = null;

  // =========================================================================
  // DOM ELEMENT SELECTORS
  // =========================================================================
  const elements = {
    currentDateDisplay: document.getElementById('current-date-display'),
    btnHeaderAddTask: document.getElementById('btn-header-add-task'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    iconMoon: document.querySelector('.icon-moon'),
    iconSun: document.querySelector('.icon-sun'),
    
    // Navigation
    navTabs: document.querySelectorAll('.nav-tab'),
    tabViews: document.querySelectorAll('.tab-view'),
    tasksBadge: document.getElementById('tasks-badge'),
    notesBadge: document.getElementById('notes-badge'),

    // Tasks
    taskCreateForm: document.getElementById('task-create-form'),
    taskTitleInput: document.getElementById('task-title-input'),
    taskDateInput: document.getElementById('task-date-input'),
    taskPriorityInput: document.getElementById('task-priority-input'),
    taskFormError: document.getElementById('task-form-error'),
    tasksList: document.getElementById('tasks-list'),
    tasksEmptyState: document.getElementById('tasks-empty-state'),
    emptyStateMessage: document.getElementById('empty-state-message'),
    tasksFooter: document.getElementById('tasks-footer'),
    tasksCountSummary: document.getElementById('tasks-count-summary'),
    btnClearCompleted: document.getElementById('btn-clear-completed'),
    filterPills: document.querySelectorAll('.filter-pill'),

    // Edit Modal
    taskEditModal: document.getElementById('task-edit-modal'),
    taskEditForm: document.getElementById('task-edit-form'),
    editTaskId: document.getElementById('edit-task-id'),
    editTaskTitle: document.getElementById('edit-task-title'),
    editTaskDate: document.getElementById('edit-task-date'),
    editTaskPriority: document.getElementById('edit-task-priority'),
    btnCloseEditModal: document.getElementById('btn-close-edit-modal'),
    btnCancelEdit: document.getElementById('btn-cancel-edit'),

    // Calendar
    calendarMonthLabel: document.getElementById('calendar-month-label'),
    btnCalPrev: document.getElementById('btn-cal-prev'),
    btnCalNext: document.getElementById('btn-cal-next'),
    btnCalToday: document.getElementById('btn-cal-today'),
    calendarGrid: document.getElementById('calendar-grid'),
    selectedDateHeading: document.getElementById('selected-date-heading'),
    selectedDateCount: document.getElementById('selected-date-count'),
    calendarTaskAddForm: document.getElementById('calendar-task-add-form'),
    calendarQuickTaskInput: document.getElementById('calendar-quick-task-input'),
    selectedDateTasksList: document.getElementById('selected-date-tasks-list'),
    calendarDayEmpty: document.getElementById('calendar-day-empty'),

    // Notes
    notesListView: document.getElementById('notes-list-view'),
    notesEditorView: document.getElementById('notes-editor-view'),
    notesSearchInput: document.getElementById('notes-search-input'),
    btnClearNotesSearch: document.getElementById('btn-clear-notes-search'),
    btnCreateNote: document.getElementById('btn-create-note'),
    notesItemsList: document.getElementById('notes-items-list'),
    notesEmptyState: document.getElementById('notes-empty-state'),
    notesEmptyTitle: document.getElementById('notes-empty-title'),
    notesEmptyHint: document.getElementById('notes-empty-hint'),
    
    // Notes Editor
    btnEditorBack: document.getElementById('btn-editor-back'),
    editorNoteTitle: document.getElementById('editor-note-title'),
    editorNoteDate: document.getElementById('editor-note-date'),
    editorNoteBody: document.getElementById('editor-note-body'),
    noteSaveStatus: document.getElementById('note-save-status'),
    btnDeleteCurrentNote: document.getElementById('btn-delete-current-note')
  };

  // =========================================================================
  // UTILITY FUNCTIONS
  // =========================================================================
  function formatDateToYMD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getTodayYMD() {
    return formatDateToYMD(new Date());
  }

  function formatDisplayHeaderDate() {
    const today = new Date();
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return today.toLocaleDateString('en-US', options);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  function formatRelativeDate(ymdString) {
    if (!ymdString) return null;
    const todayStr = getTodayYMD();

    if (ymdString === todayStr) {
      return { text: 'Today', isToday: true, isOverdue: false };
    }

    // Tomorrow calculation
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDateToYMD(tomorrow);
    if (ymdString === tomorrowStr) {
      return { text: 'Tomorrow', isToday: false, isOverdue: false };
    }

    // Parse date parts
    const [year, month, day] = ymdString.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const currentYear = new Date().getFullYear();

    const shortMonth = dateObj.toLocaleDateString('en-US', { month: 'short' });
    const formattedDate = year === currentYear ? `${shortMonth} ${day}` : `${shortMonth} ${day}, ${year}`;

    if (ymdString < todayStr) {
      return { text: `Overdue · ${formattedDate}`, isToday: false, isOverdue: true };
    }

    return { text: formattedDate, isToday: false, isOverdue: false };
  }

  function formatNoteTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();

    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (isToday) {
      return `Today, ${timeStr}`;
    }

    const monthStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${monthStr}, ${timeStr}`;
  }

  // =========================================================================
  // LOCALSTORAGE PERSISTENCE
  // =========================================================================
  function loadPersistedData() {
    try {
      const storedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (storedTasks) {
        state.tasks = JSON.parse(storedTasks);
      } else {
        state.tasks = [];
      }

      const storedNotes = localStorage.getItem(STORAGE_KEYS.NOTES);
      if (storedNotes) {
        state.notes = JSON.parse(storedNotes);
      } else {
        state.notes = [];
      }

      const storedTab = localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB);
      if (storedTab && ['tasks', 'calendar', 'notes'].includes(storedTab)) {
        state.activeTab = storedTab;
      }
    } catch (err) {
      console.error('Error loading data from localStorage:', err);
      state.tasks = [];
      state.notes = [];
    }
  }

  function persistTasks() {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(state.tasks));
    } catch (err) {
      console.error('Failed to save tasks to localStorage:', err);
    }
  }

  function persistNotes() {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(state.notes));
    } catch (err) {
      console.error('Failed to save notes to localStorage:', err);
    }
  }

  function persistActiveTab(tabName) {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, tabName);
    } catch (err) {
      console.error('Failed to save active tab to localStorage:', err);
    }
  }

  // =========================================================================
  // NAVIGATION & TABS
  // =========================================================================
  function switchTab(tabName) {
    state.activeTab = tabName;
    persistActiveTab(tabName);

    // Update Tab Buttons
    elements.navTabs.forEach((tabBtn) => {
      const isActive = tabBtn.dataset.tab === tabName;
      tabBtn.classList.toggle('active', isActive);
      tabBtn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Update Views
    elements.tabViews.forEach((view) => {
      const isTarget = view.id === `view-${tabName}`;
      view.classList.toggle('active', isTarget);
      view.classList.toggle('hidden', !isTarget);
    });

    // Refresh contents
    if (tabName === 'tasks') {
      renderTasks();
    } else if (tabName === 'calendar') {
      renderCalendar();
      renderSelectedDateTasks();
    } else if (tabName === 'notes') {
      // If returning to notes, ensure list view is active unless editing
      if (!state.activeNoteId) {
        showNotesListView();
      }
      renderNotes();
    }

    updateBadges();
  }

  function updateBadges() {
    const activeTasksCount = state.tasks.filter((t) => !t.completed).length;
    elements.tasksBadge.textContent = activeTasksCount;
    elements.notesBadge.textContent = state.notes.length;
  }

  // =========================================================================
  // TASKS MODULE
  // =========================================================================
  function getFilteredTasks() {
    const todayStr = getTodayYMD();

    switch (state.taskFilter) {
      case 'today':
        return state.tasks.filter((task) => {
          if (!task.dueDate) return false;
          // Show tasks due today or overdue incomplete tasks
          return task.dueDate === todayStr || (!task.completed && task.dueDate < todayStr);
        });

      case 'upcoming':
        return state.tasks.filter((task) => {
          return task.dueDate && task.dueDate > todayStr && !task.completed;
        });

      case 'completed':
        return state.tasks.filter((task) => task.completed);

      case 'all':
      default:
        // Show all: incomplete first, completed after
        return [...state.tasks].sort((a, b) => {
          if (a.completed === b.completed) return 0;
          return a.completed ? 1 : -1;
        });
    }
  }

  function renderTasks() {
    const filteredTasks = getFilteredTasks();
    elements.tasksList.innerHTML = '';

    if (filteredTasks.length === 0) {
      elements.tasksEmptyState.classList.remove('hidden');
      updateEmptyStateMessage();
    } else {
      elements.tasksEmptyState.classList.add('hidden');
      filteredTasks.forEach((task) => {
        const itemEl = createTaskRowElement(task);
        elements.tasksList.appendChild(itemEl);
      });
    }

    // Tasks summary and clear completed
    const totalCount = state.tasks.length;
    const completedCount = state.tasks.filter((t) => t.completed).length;
    const remainingCount = totalCount - completedCount;

    elements.tasksCountSummary.textContent = `${remainingCount} task${remainingCount === 1 ? '' : 's'} remaining`;

    if (completedCount > 0) {
      elements.btnClearCompleted.classList.remove('hidden');
      elements.btnClearCompleted.textContent = `Clear completed (${completedCount})`;
    } else {
      elements.btnClearCompleted.classList.add('hidden');
    }

    updateBadges();
  }

  function updateEmptyStateMessage() {
    switch (state.taskFilter) {
      case 'today':
        elements.emptyStateMessage.textContent = 'No tasks due today';
        break;
      case 'upcoming':
        elements.emptyStateMessage.textContent = 'No upcoming tasks';
        break;
      case 'completed':
        elements.emptyStateMessage.textContent = 'No completed tasks yet';
        break;
      case 'all':
      default:
        elements.emptyStateMessage.textContent = 'No tasks found';
        break;
    }
  }

  function createTaskRowElement(task) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.dataset.id = task.id;
    if (task.priority && task.priority !== 'none') {
      li.dataset.priority = task.priority;
    }

    // Checkbox
    const checkBtn = document.createElement('button');
    checkBtn.type = 'button';
    checkBtn.className = 'task-checkbox-btn';
    checkBtn.setAttribute('aria-label', task.completed ? 'Mark task incomplete' : 'Mark task completed');
    checkBtn.innerHTML = `
      <svg class="checkbox-check-icon" viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;
    checkBtn.addEventListener('click', () => toggleTaskCompletion(task.id));

    // Content container
    const contentDiv = document.createElement('div');
    contentDiv.className = 'task-content';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'task-title';
    titleSpan.textContent = task.title;
    contentDiv.appendChild(titleSpan);

    // Meta row (date + priority)
    const metaRow = document.createElement('div');
    metaRow.className = 'task-meta-row';

    // Due date badge
    if (task.dueDate) {
      const relDate = formatRelativeDate(task.dueDate);
      if (relDate) {
        const dateBadge = document.createElement('span');
        let badgeClass = 'badge badge-date';
        if (!task.completed) {
          if (relDate.isOverdue) badgeClass += ' overdue';
          else if (relDate.isToday) badgeClass += ' today';
        }
        dateBadge.className = badgeClass;
        dateBadge.textContent = relDate.text;
        metaRow.appendChild(dateBadge);
      }
    }

    // Priority badge
    if (task.priority && task.priority !== 'none') {
      const priorityBadge = document.createElement('span');
      priorityBadge.className = `badge badge-priority ${task.priority}`;
      priorityBadge.innerHTML = `
        <span class="priority-dot" aria-hidden="true"></span>
        <span>${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
      `;
      metaRow.appendChild(priorityBadge);
    }

    if (metaRow.children.length > 0) {
      contentDiv.appendChild(metaRow);
    }

    // Actions container
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'task-actions';

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-task-action edit-action';
    editBtn.setAttribute('aria-label', 'Edit task');
    editBtn.title = 'Edit task';
    editBtn.innerHTML = `
      <svg class="icon-svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
      </svg>
    `;
    editBtn.addEventListener('click', () => openEditModal(task.id));

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-task-action delete-action';
    deleteBtn.setAttribute('aria-label', 'Delete task');
    deleteBtn.title = 'Delete task';
    deleteBtn.innerHTML = `
      <svg class="icon-svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);

    li.appendChild(checkBtn);
    li.appendChild(contentDiv);
    li.appendChild(actionsDiv);

    return li;
  }

  function handleCreateTask(e) {
    e.preventDefault();
    const title = elements.taskTitleInput.value.trim();
    if (!title) {
      elements.taskFormError.textContent = 'Please enter a task description.';
      elements.taskTitleInput.focus();
      return;
    }

    elements.taskFormError.textContent = '';
    const dueDate = elements.taskDateInput.value;
    const priority = elements.taskPriorityInput.value;

    const newTask = {
      id: generateId('task'),
      title,
      dueDate: dueDate || '',
      priority: priority || 'none',
      completed: false,
      createdAt: Date.now()
    };

    state.tasks.unshift(newTask);
    persistTasks();

    // Reset inputs
    elements.taskTitleInput.value = '';
    elements.taskDateInput.value = '';
    elements.taskPriorityInput.value = 'none';

    renderTasks();
    if (state.activeTab === 'calendar') {
      renderCalendar();
      renderSelectedDateTasks();
    }
  }

  function toggleTaskCompletion(taskId) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    persistTasks();
    renderTasks();

    if (state.activeTab === 'calendar') {
      renderCalendar();
      renderSelectedDateTasks();
    }
  }

  function deleteTask(taskId) {
    state.tasks = state.tasks.filter((t) => t.id !== taskId);
    persistTasks();
    renderTasks();

    if (state.activeTab === 'calendar') {
      renderCalendar();
      renderSelectedDateTasks();
    }
  }

  function clearCompletedTasks() {
    state.tasks = state.tasks.filter((t) => !t.completed);
    persistTasks();
    renderTasks();

    if (state.activeTab === 'calendar') {
      renderCalendar();
      renderSelectedDateTasks();
    }
  }

  // =========================================================================
  // TASK EDIT MODAL
  // =========================================================================
  function openEditModal(taskId) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    elements.editTaskId.value = task.id;
    elements.editTaskTitle.value = task.title;
    elements.editTaskDate.value = task.dueDate || '';
    elements.editTaskPriority.value = task.priority || 'none';

    elements.taskEditModal.classList.remove('hidden');
    elements.editTaskTitle.focus();
  }

  function closeEditModal() {
    elements.taskEditModal.classList.add('hidden');
    elements.taskEditForm.reset();
  }

  function handleSaveEditTask(e) {
    e.preventDefault();
    const taskId = elements.editTaskId.value;
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const title = elements.editTaskTitle.value.trim();
    if (!title) {
      elements.editTaskTitle.focus();
      return;
    }

    task.title = title;
    task.dueDate = elements.editTaskDate.value || '';
    task.priority = elements.editTaskPriority.value || 'none';

    persistTasks();
    closeEditModal();
    renderTasks();

    if (state.activeTab === 'calendar') {
      renderCalendar();
      renderSelectedDateTasks();
    }
  }

  // =========================================================================
  // CALENDAR MODULE
  // =========================================================================
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  function renderCalendar() {
    const { year, month } = state.calendar;
    elements.calendarMonthLabel.textContent = `${MONTH_NAMES[month]} ${year}`;

    elements.calendarGrid.innerHTML = '';

    const firstDayOfMonth = new Date(year, month, 1);
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();

    // Monday as first day of week: Sunday = 0 -> 6, Mon = 1 -> 0
    let startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const todayStr = getTodayYMD();

    // Set of dates having tasks
    const datesWithTasks = new Set();
    state.tasks.forEach((t) => {
      if (t.dueDate) datesWithTasks.add(t.dueDate);
    });

    // 1. Previous month trailing days
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell other-month';
      cell.textContent = dayNum;
      elements.calendarGrid.appendChild(cell);
    }

    // 2. Current month days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dateYMD = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cal-day-cell';
      cell.textContent = day;
      cell.dataset.date = dateYMD;
      cell.setAttribute('aria-label', `${MONTH_NAMES[month]} ${day}, ${year}`);

      if (dateYMD === todayStr) {
        cell.classList.add('is-today');
      }

      if (dateYMD === state.calendar.selectedDate) {
        cell.classList.add('is-selected');
        cell.setAttribute('aria-current', 'date');
      }

      // Check if task exists on this date
      if (datesWithTasks.has(dateYMD)) {
        const dot = document.createElement('span');
        dot.className = 'cal-task-dot';
        dot.setAttribute('aria-hidden', 'true');
        cell.appendChild(dot);
      }

      cell.addEventListener('click', () => {
        selectCalendarDate(dateYMD);
      });

      elements.calendarGrid.appendChild(cell);
    }

    // 3. Next month leading days (to complete the grid)
    const totalRendered = startDayIndex + daysInCurrentMonth;
    const remainingCells = (7 - (totalRendered % 7)) % 7;
    for (let nextDay = 1; nextDay <= remainingCells; nextDay++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell other-month';
      cell.textContent = nextDay;
      elements.calendarGrid.appendChild(cell);
    }
  }

  function selectCalendarDate(dateYMD) {
    state.calendar.selectedDate = dateYMD;

    // Update active highlight
    const allCells = elements.calendarGrid.querySelectorAll('.cal-day-cell');
    allCells.forEach((c) => {
      if (c.dataset.date === dateYMD) {
        c.classList.add('is-selected');
        c.setAttribute('aria-current', 'date');
      } else {
        c.classList.remove('is-selected');
        c.removeAttribute('aria-current');
      }
    });

    renderSelectedDateTasks();
  }

  function renderSelectedDateTasks() {
    const selectedDate = state.calendar.selectedDate || getTodayYMD();
    const [year, month, day] = selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);

    const formattedHeading = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });

    elements.selectedDateHeading.textContent = `Tasks for ${formattedHeading}`;

    // Filter tasks due on this date
    const dayTasks = state.tasks.filter((t) => t.dueDate === selectedDate);
    elements.selectedDateCount.textContent = `${dayTasks.length} task${dayTasks.length === 1 ? '' : 's'}`;

    elements.selectedDateTasksList.innerHTML = '';

    if (dayTasks.length === 0) {
      elements.calendarDayEmpty.classList.remove('hidden');
    } else {
      elements.calendarDayEmpty.classList.add('hidden');
      dayTasks.forEach((task) => {
        const itemEl = createTaskRowElement(task);
        elements.selectedDateTasksList.appendChild(itemEl);
      });
    }

    // Update calendar quick add placeholder
    elements.calendarQuickTaskInput.placeholder = `Add task for ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}...`;
  }

  function handleCalendarQuickAddTask(e) {
    e.preventDefault();
    const title = elements.calendarQuickTaskInput.value.trim();
    if (!title) {
      elements.calendarQuickTaskInput.focus();
      return;
    }

    const newTask = {
      id: generateId('task'),
      title,
      dueDate: state.calendar.selectedDate || getTodayYMD(),
      priority: 'none',
      completed: false,
      createdAt: Date.now()
    };

    state.tasks.unshift(newTask);
    persistTasks();

    elements.calendarQuickTaskInput.value = '';
    renderCalendar();
    renderSelectedDateTasks();
    updateBadges();
  }

  function prevMonth() {
    state.calendar.month -= 1;
    if (state.calendar.month < 0) {
      state.calendar.month = 11;
      state.calendar.year -= 1;
    }
    renderCalendar();
  }

  function nextMonth() {
    state.calendar.month += 1;
    if (state.calendar.month > 11) {
      state.calendar.month = 0;
      state.calendar.year += 1;
    }
    renderCalendar();
  }

  function goToTodayMonth() {
    const now = new Date();
    state.calendar.year = now.getFullYear();
    state.calendar.month = now.getMonth();
    state.calendar.selectedDate = formatDateToYMD(now);
    renderCalendar();
    renderSelectedDateTasks();
  }

  // =========================================================================
  // NOTES MODULE
  // =========================================================================
  function renderNotes() {
    const query = state.searchQuery.toLowerCase().trim();
    let filteredNotes = state.notes;

    if (query) {
      filteredNotes = filteredNotes.filter((note) => {
        const titleMatch = (note.title || '').toLowerCase().includes(query);
        const bodyMatch = (note.body || '').toLowerCase().includes(query);
        return titleMatch || bodyMatch;
      });
    }

    // Sort by latest updated
    filteredNotes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    elements.notesItemsList.innerHTML = '';

    if (filteredNotes.length === 0) {
      elements.notesEmptyState.classList.remove('hidden');
      if (query) {
        elements.notesEmptyTitle.textContent = `No notes matching "${state.searchQuery}"`;
        elements.notesEmptyHint.textContent = 'Try adjusting your search terms.';
      } else {
        elements.notesEmptyTitle.textContent = 'No notes yet';
        elements.notesEmptyHint.textContent = 'Capture your thoughts, ideas, or quick lists anytime.';
      }
    } else {
      elements.notesEmptyState.classList.add('hidden');
      filteredNotes.forEach((note) => {
        const card = createNoteCardElement(note);
        elements.notesItemsList.appendChild(card);
      });
    }

    updateBadges();
  }

  function createNoteCardElement(note) {
    const li = document.createElement('li');
    li.className = 'note-card-item';
    li.dataset.id = note.id;

    const displayTitle = note.title.trim() || 'Untitled note';
    const excerpt = note.body.trim() ? note.body.trim().replace(/\n+/g, ' ') : 'No additional text';

    li.innerHTML = `
      <div class="note-card-top">
        <h4 class="note-card-title">${escapeHTML(displayTitle)}</h4>
      </div>
      <p class="note-card-excerpt">${escapeHTML(excerpt)}</p>
      <div class="note-card-footer">
        <span class="note-card-date">${formatNoteTimestamp(note.updatedAt)}</span>
      </div>
    `;

    li.addEventListener('click', () => {
      openNoteEditor(note.id);
    });

    return li;
  }

  function createNewNote() {
    const newNote = {
      id: generateId('note'),
      title: '',
      body: '',
      updatedAt: Date.now()
    };

    state.notes.unshift(newNote);
    persistNotes();
    openNoteEditor(newNote.id);
  }

  function openNoteEditor(noteId) {
    const note = state.notes.find((n) => n.id === noteId);
    if (!note) return;

    state.activeNoteId = note.id;
    elements.editorNoteTitle.value = note.title;
    elements.editorNoteBody.value = note.body;
    elements.editorNoteDate.textContent = `Last edited ${formatNoteTimestamp(note.updatedAt)}`;
    elements.noteSaveStatus.textContent = 'Saved';

    showNotesEditorView();
    elements.editorNoteTitle.focus();
  }

  function showNotesListView() {
    state.activeNoteId = null;
    elements.notesEditorView.classList.add('hidden');
    elements.notesListView.classList.remove('hidden');
    renderNotes();
  }

  function showNotesEditorView() {
    elements.notesListView.classList.add('hidden');
    elements.notesEditorView.classList.remove('hidden');
  }

  function handleNoteInput() {
    if (!state.activeNoteId) return;
    const note = state.notes.find((n) => n.id === state.activeNoteId);
    if (!note) return;

    elements.noteSaveStatus.textContent = 'Saving...';
    clearTimeout(saveNoteTimeout);

    saveNoteTimeout = setTimeout(() => {
      note.title = elements.editorNoteTitle.value;
      note.body = elements.editorNoteBody.value;
      note.updatedAt = Date.now();

      persistNotes();
      elements.noteSaveStatus.textContent = 'Saved';
      elements.editorNoteDate.textContent = `Last edited ${formatNoteTimestamp(note.updatedAt)}`;
      updateBadges();
    }, 250);
  }

  function deleteCurrentNote() {
    if (!state.activeNoteId) return;
    state.notes = state.notes.filter((n) => n.id !== state.activeNoteId);
    persistNotes();
    showNotesListView();
    updateBadges();
  }

  function handleSearchNotes(e) {
    state.searchQuery = e.target.value;
    if (state.searchQuery) {
      elements.btnClearNotesSearch.classList.remove('hidden');
    } else {
      elements.btnClearNotesSearch.classList.add('hidden');
    }
    renderNotes();
  }

  function clearNotesSearch() {
    elements.notesSearchInput.value = '';
    state.searchQuery = '';
    elements.btnClearNotesSearch.classList.add('hidden');
    renderNotes();
    elements.notesSearchInput.focus();
  }

  // =========================================================================
  // THEME MANAGEMENT (LIGHT / DARK MODE)
  // =========================================================================
  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }

  function setTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch (err) {
      console.warn('Could not save theme preference:', err);
    }

    if (elements.iconMoon && elements.iconSun) {
      if (theme === 'dark') {
        elements.iconMoon.classList.add('hidden');
        elements.iconSun.classList.remove('hidden');
        if (elements.btnThemeToggle) {
          elements.btnThemeToggle.setAttribute('aria-label', 'Switch to light mode');
          elements.btnThemeToggle.setAttribute('title', 'Switch to light mode');
        }
      } else {
        elements.iconMoon.classList.remove('hidden');
        elements.iconSun.classList.add('hidden');
        if (elements.btnThemeToggle) {
          elements.btnThemeToggle.setAttribute('aria-label', 'Switch to dark mode');
          elements.btnThemeToggle.setAttribute('title', 'Switch to dark mode');
        }
      }
    }
  }

  function toggleTheme() {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  }

  // =========================================================================
  // EVENT LISTENERS & SETUP
  // =========================================================================
  function setupEventListeners() {
    // Theme toggle
    if (elements.btnThemeToggle) {
      elements.btnThemeToggle.addEventListener('click', toggleTheme);
    }
    // Navigation Tabs
    elements.navTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        switchTab(tab.dataset.tab);
      });
    });

    // Header "+ Add task" button: switch to Tasks tab & focus title input
    elements.btnHeaderAddTask.addEventListener('click', () => {
      if (state.activeTab !== 'tasks') {
        switchTab('tasks');
      }
      elements.taskTitleInput.focus();
      elements.taskTitleInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // Tasks filter pills
    elements.filterPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        elements.filterPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        state.taskFilter = pill.dataset.filter;
        renderTasks();
      });
    });

    // Create Task Form
    elements.taskCreateForm.addEventListener('submit', handleCreateTask);

    // Clear completed tasks
    elements.btnClearCompleted.addEventListener('click', clearCompletedTasks);

    // Edit Modal Events
    elements.taskEditForm.addEventListener('submit', handleSaveEditTask);
    elements.btnCloseEditModal.addEventListener('click', closeEditModal);
    elements.btnCancelEdit.addEventListener('click', closeEditModal);

    elements.taskEditModal.addEventListener('click', (e) => {
      if (e.target === elements.taskEditModal) {
        closeEditModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !elements.taskEditModal.classList.contains('hidden')) {
        closeEditModal();
      }
    });

    // Calendar navigation
    elements.btnCalPrev.addEventListener('click', prevMonth);
    elements.btnCalNext.addEventListener('click', nextMonth);
    elements.btnCalToday.addEventListener('click', goToTodayMonth);

    // Calendar day quick add
    elements.calendarTaskAddForm.addEventListener('submit', handleCalendarQuickAddTask);

    // Notes List Events
    elements.btnCreateNote.addEventListener('click', createNewNote);
    elements.notesSearchInput.addEventListener('input', handleSearchNotes);
    elements.btnClearNotesSearch.addEventListener('click', clearNotesSearch);

    // Notes Editor Events
    elements.btnEditorBack.addEventListener('click', showNotesListView);
    elements.editorNoteTitle.addEventListener('input', handleNoteInput);
    elements.editorNoteBody.addEventListener('input', handleNoteInput);
    elements.btnDeleteCurrentNote.addEventListener('click', deleteCurrentNote);
  }

  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  function init() {
    // 0. Initialize theme
    initTheme();

    // 1. Display formatted date in header
    elements.currentDateDisplay.textContent = formatDisplayHeaderDate();

    // 2. Set default date picker attribute (optional min/max if needed)
    elements.taskDateInput.value = '';

    // 3. Load persisted LocalStorage data
    loadPersistedData();

    // 4. Attach event listeners
    setupEventListeners();

    // 5. Initialize view
    switchTab(state.activeTab || 'tasks');
    goToTodayMonth();
    updateBadges();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
