/**
 * Stores the currently selected board object.
 * @type {Object}
 */
let currentBoard = {}

/**
 * Stores the currently selected task object.
 * @type {Object|undefined}
 */
let currentTask

/**
 * Stores the current comments for the selected task or board.
 * @type {Array|undefined}
 */
let currentComments

/**
 * Indicates whether the Shift key is currently pressed.
 * @type {boolean}
 */
let isShiftPressed = false

/**
 * Stores the list of current board members.
 * @type {Array|undefined}
 */
let currentMemberList

/**
 * Sets the isShiftPressed flag to true if the Shift key is pressed.
 *
 * Typically used in keydown event listeners to detect multi-line input
 * or modifier key usage.
 *
 * @param {KeyboardEvent} event - The keyboard event object.
 */
function setShift(event) {
    if (event.keyCode == 16) isShiftPressed = true;
}

/**
 * Resets the isShiftPressed flag to false when the Shift key is released.
 *
 * Typically used in keyup event listeners to track modifier key state.
 *
 * @param {KeyboardEvent} event - The keyboard event object.
 */
function unsetShift(event) {
    if (event.keyCode == 16) isShiftPressed = false;
}

/**
 * Initializes the currentTask object to default values.
 *
 * Use this to reset the task state before creating or editing a task.
 * Sets all properties to null except priority, which is set to 'medium'.
 */
function cleanCurrentTask() {
    currentTask = {
        "id": null,
        "title": null,
        "description": null,
        "status": null,
        "priority": 'medium',
        "assignee": null,
        "reviewer": null,
        "due_date": null
    }
}

/**
 * Initializes the board view on page load.
 *
 * Lädt Boarddaten, setzt State zurück, rendert Tasks/Members,
 * aktualisiert den Titel & toggelt die Graphics‑Header‑Buttons
 * (GFX‑Manual, Kits, Roster) – ohne sichtbaren „Flash“.
 *
 * @returns {Promise<void>}
 */
async function init() {
  // Erst alles verstecken → kein Flash
  prehideGraphicsOnlyButtons();

  await setBoard();
  window.currentBoard = currentBoard;
  cleanCurrentTask();
  renderAllTasks();
  renderMemberList();
  renderTitle();

  const hdrBtn = document.getElementById('pdf-download-btn');
  if (hdrBtn) hdrBtn.style.display = 'none';

  // Buttons für Graphics‑Boards toggeln
  updateGfxManualButton();
  updateKitsButton();
  updateRosterButton(); // ← NEU

  const tid = getParamFromUrl('task_id');
  if (tid) openTaskDetailDialog(tid);
}

/**
 * Updates the board title in the DOM.
 *
 * Sets the inner text of the elements with IDs 'board_title_link' and 'board_title'
 * to the current board's title.
 */
function renderTitle() {
    document.getElementById('board_title_link').innerText = currentBoard.title
    document.getElementById('board_title').innerText = currentBoard.title
}

/**
 * Fetches the board data for the current page and updates the currentBoard object.
 *
 * Uses the board ID from the URL parameters and retrieves the board data from the API.
 * If the request is successful, updates the global currentBoard variable.
 *
 * @returns {Promise<void>} Resolves when the board data is loaded.
 */
async function setBoard() {
    let boardResp = await getData(BOARDS_URL + getParamFromUrl("id"))
    if (boardResp.ok) {
        currentBoard = boardResp.data
    }
}

/**
 * Renders the list of board member profile circles in the DOM.
 *
 * Inserts the generated HTML from getMemberListTemplate(currentBoard)
 * into the element with the ID 'short_profile_list'.
 */
function renderMemberList() {
    let listRef = document.getElementById('short_profile_list')
    listRef.innerHTML = getMemberListTemplate(currentBoard)
}

/**
 * Opens the detail dialog for a specific task.
 *
 * Sets the currentTask to a deep copy of the task with the given ID,
 * switches the current dialog to "task_detail_dialog",
 * opens the dialog wrapper, and loads the detailed task data.
 *
 * @param {number|string} id - The unique identifier of the task to display.
 * @returns {Promise<void>} Resolves when the detail task data is loaded.
 */
async function openTaskDetailDialog(id) {
    currentTask = JSON.parse(JSON.stringify(getTaskById(id)))
    changeCurrentDialog("task_detail_dialog")
    toggleOpenId('dialog_wrapper')
    await loadAndRenderDetailTask(id)
}

/**
 * Loads the comments for the specified task and renders the task details in the dialog.
 *
 * Updates the global currentComments variable and refreshes the task detail view.
 *
 * @param {number|string} id - The unique identifier of the task.
 * @returns {Promise<void>} Resolves when comments are loaded and task details are rendered.
 */
async function loadAndRenderDetailTask(id) {
    currentComments = await getTaskComments(id)
    renderDetailTask()
}

/**
 * Renders the details of the current task in the detail dialog.
 *
 * Updates all relevant DOM elements with the current task's status, title,
 * description, assignee, reviewer, due date, priority, and comments.
 */
function renderDetailTask() {
    document.getElementById('task_detail_dialog_select').value = currentTask.status
    document.getElementById('detail_task_title').innerHTML = currentTask.title
    document.getElementById('detail_task_description').innerHTML = currentTask.description
    document.getElementById('detail_task_assignee').innerHTML = getDetailTaskPersonTemplate(currentTask.assignee)
    document.getElementById('detail_task_reviewer').innerHTML = getDetailTaskPersonTemplate(currentTask.reviewer)
    renderDetailTaskDueDate()
    renderDetailTaskPriority()
    renderDetailTaskComments()
    bindPdfButtonsForSfl();
}

/**
 * Renders the priority badge and label for the current task in the detail dialog.
 *
 * Updates the element with ID 'detail_task_priority' with a visual badge
 * and the current task's priority level.
 */
function renderDetailTaskPriority() {
    let prioRef = document.getElementById('detail_task_priority')
    prioRef.innerHTML = `<div priority="${currentTask.priority}" class="priority-badge"></div><p >${currentTask.priority}</p>`
}

/**
 * Renders the due date for the current task in the detail dialog.
 *
 * Updates the element with ID 'detail_task_due_date' to display the current task's due date.
 */
function renderDetailTaskDueDate() {
    let prioRef = document.getElementById('detail_task_due_date')
    prioRef.innerHTML = currentTask.due_date
}

/**
 * Fetches the comments for a specific task by its ID.
 *
 * Sends a GET request to the task comments endpoint. If successful,
 * returns the array of comment objects. Otherwise, returns an empty array.
 *
 * @param {number|string} id - The unique identifier of the task.
 * @returns {Promise<Array>} Promise resolving to an array of comment objects.
 */
async function getTaskComments(id) {
    let commentResp = await getData(TASKS_URL + id + "/comments/")
    if (commentResp.ok) {
        return commentResp.data
    } else {
        return []
    }
}

/**
 * Handles the keyup event in the comment textarea.
 *
 * If the Enter key (keyCode 13) is pressed without the Shift key,
 * submits the comment by calling postComment().
 *
 * @param {KeyboardEvent} event - The keyboard event object.
 * @param {HTMLElement} element - The textarea element containing the comment.
 */
async function sendComment(event, element) {
    if (event.keyCode == 13 && !isShiftPressed) {
        postComment(element)
    }
}

/**
 * Submits the comment entered in the comment textarea directly.
 *
 * Retrieves the textarea element by its ID and calls postComment() to submit its content.
 *
 * @returns {Promise<void>}
 */
async function sendCommentDirectly() {
    let element = document.getElementById('comment_textarea')
    postComment(element)
}

/**
 * Submits a new comment for the current task.
 *
 * If the textarea contains content, sends a POST request to the comments endpoint.
 * On success, clears the textarea, reloads the comments, and updates the UI.
 * If the request fails, displays error messages.
 *
 * @param {HTMLTextAreaElement} element - The textarea element containing the comment text.
 * @returns {Promise<void>}
 */
async function postComment(element) {
    let newComment = {
        "content": element.value.trim()
    }
    if (newComment.content.length > 0) {
        let response = await postData(TASKS_URL + currentTask.id + "/comments/", newComment)
        if (!response.ok) {
            let errorArr = extractErrorMessages(response.data)
            showToastMessage(true, errorArr)
        } else {
            element.value = ''
            currentComments = await getTaskComments(currentTask.id)
            renderDetailTaskComments()
        }
    }
}

/**
 * Renders all comments for the current task in the detail dialog.
 *
 * Updates the sender profile with the current user's initials,
 * and populates the comment list with all comments using getSingleCommmentTemplate().
 */
function renderDetailTaskComments() {
    let userInitials = getInitials(getAuthFullname())
    document.getElementById('comment_sender_profile').innerHTML = `<div class="profile_circle color_${userInitials[0]}">${userInitials}</div>`;
    let listRef = document.getElementById("task_comment_list")
    let listHtml = "";
    currentComments.forEach(comment => {
        listHtml += getSingleCommmentTemplate(comment)
    });
    listRef.innerHTML = listHtml;
}

/* ------------------------------------------------------------------ */
/*  GRAPHICS–BOARD DETECTION                                          */
/* ------------------------------------------------------------------ */
/**
 * Checks whether the currently opened board is the new Graphics Report.
 * Detection is based on a simple title heuristic: either the title starts
 * with "Graphics" or contains "GFX-Rapport" (case-insensitive).
 *
 * @returns {boolean} True if the board title matches the Graphics Report pattern, otherwise false.
 */
function isGraphicsRapportBoard() {
    if (!currentBoard?.title) return false;
    const t = currentBoard.title.toLowerCase();
    return t.startsWith('graphics') || t.includes('gfx-rapport');
}

/* ------------------------------------------------------------------ */
/*  DEFAULT FORM INJECTOR                                             */
/* ------------------------------------------------------------------ */
/**
 * Injects the prebuilt Graphics Report HTML into `currentTask.description`
 * if the current board is detected as a Graphics Report board.
 *
 * Relies on:
 * - {@link isGraphicsRapportBoard} to detect board type.
 * - `window.GRAPHICS_RAPPORT_FORM_HTML` holding the HTML template string.
 *
 * @returns {void}
 */
function setDefaultDescriptionForGraphics() {
    if (isGraphicsRapportBoard() && window.GRAPHICS_RAPPORT_FORM_HTML) {
        currentTask.description = window.GRAPHICS_RAPPORT_FORM_HTML;
    }
}

/* ------------------------------------------------------------------ */
/*  GFX Manual Button – Visibility & Link                             */
/* ------------------------------------------------------------------ */
/**
 * Toggles the visibility of the GFX Manual button in the board header
 * and sets its link target.
 *
 * - Visible ONLY for graphics boards (detected via {@link isGraphicsRapportBoard})
 * - Link taken from `GFX_MANUAL_URL` (defined in config.js)
 * - Fallback link: `/manuals/bbm_gfx_manual.pdf`
 *
 * @returns {void}
 */
function updateGfxManualButton() {
    const btn = document.getElementById('gfx-manual-btn');
    if (!btn) return;

    const isGraphics = typeof isGraphicsRapportBoard === 'function' && isGraphicsRapportBoard();

    if (isGraphics) {
        const url = (typeof GFX_MANUAL_URL !== 'undefined' && GFX_MANUAL_URL)
            ? GFX_MANUAL_URL
            : '/manuals/bbm_gfx_manual.pdf';
        btn.href = url;
    }

    // Harte Sichtbarkeitssteuerung (verhindert "Flash")
    btn.hidden = !isGraphics;
    btn.style.display = isGraphics ? 'inline-flex' : 'none';
}

/* ------------------------------------------------------------------ */
/*  Kits Button – Visibility & Action                                  */
/* ------------------------------------------------------------------ */
/**
 * Toggles the visibility and click action of the "Kits" button
 * in the board header – analog zum GFX‑Manual‑Button.
 *
 * Regeln:
 *  - Sichtbar NUR auf Graphics‑Boards (per {@link isGraphicsRapportBoard}).
 *  - Wenn sichtbar: Klick öffnet das Kits‑Overlay (window.showGfxKitsGrid()).
 *  - Button‑ID: bevorzugt '#gfx-kits-btn'; Fallback '#kits-btn'.
 *  - Zusätzlich per IIFE injizierte Buttons ('.gfx-kits-btn') werden mitgesteuert.
 *
 * Voraussetzungen:
 *  - Die Kits‑IIFE setzt global: window.showGfxKitsGrid (optional).
 *
 * @returns {void}
 */
function updateKitsButton() {
    const isGraphics =
        typeof isGraphicsRapportBoard === 'function' && isGraphicsRapportBoard();

    // Header-Button (IDs geprüft in Reihenfolge)
    const headerBtn =
        document.getElementById('gfx-kits-btn') ||
        document.getElementById('kits-btn');

    if (headerBtn) {
        headerBtn.hidden = !isGraphics;
        headerBtn.style.display = isGraphics ? 'inline-flex' : 'none';

        if (!isGraphics) {
            headerBtn.onclick = null;            // eventuelle Direktbindung lösen
            headerBtn.removeAttribute('data-bound');
        } else if (!headerBtn.dataset.bound) {
            headerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof window.showGfxKitsGrid === 'function') {
                    window.showGfxKitsGrid();
                } else {
                    console.warn('[Kits] window.showGfxKitsGrid() ist noch nicht verfügbar.');
                }
            });
            headerBtn.dataset.bound = '1';
        }
    }

    // Zusätzlich: evtl. bereits injizierte Buttons (per IIFE) mitsteuern
    document.querySelectorAll('.gfx-kits-btn').forEach((btn) => {
        btn.hidden = !isGraphics;
        btn.style.display = isGraphics ? '' : 'none';

        if (!isGraphics) {
            btn.onclick = null;
            btn.removeAttribute('data-bound');
        } else if (!btn.dataset.bound) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof window.showGfxKitsGrid === 'function') {
                    window.showGfxKitsGrid();
                }
            });
            btn.dataset.bound = '1';
        }
    });
}

/* ------------------------------------------------------------------ */
/*  Roster / PlayerPics Button – Visibility & Action                   */
/* ------------------------------------------------------------------ */
/**
 * Toggles the visibility and click action of the "Kader & Portraits"
 * header button – analog zum GFX‑Manual und Kits‑Button.
 *
 * Regeln:
 *  - Sichtbar NUR auf Graphics‑Boards (per {@link isGraphicsRapportBoard}).
 *  - Wenn sichtbar: Klick öffnet das Roster‑Overlay (window.showGfxRosterGrid()).
 *  - Button‑ID: bevorzugt '#gfx-roster-btn'; Fallback '#playerpics-btn'.
 *  - Zusätzlich per Script injizierte Buttons ('.gfx-roster-btn') werden mitgesteuert.
 *
 * Voraussetzungen:
 *  - Die Roster‑IIFE setzt global: window.showGfxRosterGrid() (siehe IIFE unten).
 *
 * @returns {void}
 */
function updateRosterButton() {
  const isGraphics =
    typeof isGraphicsRapportBoard === 'function' && isGraphicsRapportBoard();

  // Header-Button (IDs in Reihenfolge prüfen)
  const headerBtn =
    document.getElementById('gfx-roster-btn') ||
    document.getElementById('playerpics-btn');

  if (headerBtn) {
    headerBtn.hidden = !isGraphics;
    headerBtn.style.display = isGraphics ? 'inline-flex' : 'none';

    if (!isGraphics) {
      headerBtn.onclick = null;
      headerBtn.removeAttribute('data-bound');
    } else if (!headerBtn.dataset.bound) {
      headerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.showGfxRosterGrid === 'function') {
          window.showGfxRosterGrid();
        } else {
          console.warn('[Roster] window.showGfxRosterGrid() ist noch nicht verfügbar.');
        }
      });
      headerBtn.dataset.bound = '1';
    }
  }

  // Falls woanders injiziert (z.B. neben GFX‑Manual) – opt. mitsteuern
  document.querySelectorAll('.gfx-roster-btn').forEach((btn) => {
    btn.hidden = !isGraphics;
    btn.style.display = isGraphics ? '' : 'none';

    if (!isGraphics) {
      btn.onclick = null;
      btn.removeAttribute('data-bound');
    } else if (!btn.dataset.bound) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.showGfxRosterGrid === 'function') {
          window.showGfxRosterGrid();
        }
      });
      btn.dataset.bound = '1';
    }
  });
}

/* ------------------------------------------------------------------ */
/*  Graphics‑Only Header Buttons: Pre‑Hide to prevent initial flash    */
/* ------------------------------------------------------------------ */
/**
 * Immediately hides header buttons that should only appear
 * on Graphics boards (GFX Manual & Kits). This prevents a brief
 * flash before `init()` has loaded the board and toggled visibility.
 *
 * Safe to call multiple times.
 *
 * Hides:
 *  - #gfx-manual-btn (falls vorhanden)
 *  - #gfx-kits-btn (falls vorhanden)
 *  - .gfx-kits-btn (falls per IIFE injiziert)
 *
 * @returns {void}
 */
function prehideGraphicsOnlyButtons() {
    // Header IDs
    ['gfx-manual-btn', 'gfx-kits-btn'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.hidden = true;           // semantisch
            el.style.display = 'none';  // visuell
        }
    });

    // Evtl. bereits injizierte Kits-Buttons mitsteuern
    document.querySelectorAll('.gfx-kits-btn').forEach((el) => {
        el.hidden = true;
        el.style.display = 'none';
    });
}

/* ------------------------------------------------------------------ */
/*  REPLACED openCreateTaskDialog()                                   */
/* ------------------------------------------------------------------ */
/**
 * Opens the "Add Task" dialog.
 * Now supports two special board types:
 *   • Debriefing Boards   → `window.DEBRIEFING_FORM_HTML`
 *   • Graphics Boards     → `window.GRAPHICS_RAPPORT_FORM_HTML`
 *
 * @param {string} [status] - Optional initial status ("to-do", "in-progress", etc.).
 *                            Defaults to "to-do" if not provided.
 * @returns {void}
 */
function openCreateTaskDialog(status) {
    cleanCurrentTask();
    currentTask.status = status || 'to-do';

    /* ---------- Special Forms ------------------------------------ */
    // 1) Swiss Football League Debriefing
    if (
        currentBoard.title === 'Debriefing – Swiss Football League' &&
        window.DEBRIEFING_FORM_HTML
    ) {
        currentTask.description = window.DEBRIEFING_FORM_HTML;
    }

    // 2) Graphics Report (NEW)
    setDefaultDescriptionForGraphics();
    /* -------------------------------------------------------------- */

    changeCurrentDialog('create_edit_task_dialog');
    toggleOpenId('dialog_wrapper');
    fillEditCreateTaskDialog('create');
}

/**
 * Opens the dialog to edit the currently selected task.
 *
 * Switches the current dialog to the task edit dialog and populates the form fields with the current task's data.
 */
function openEditTaskDialog() {
    changeCurrentDialog("create_edit_task_dialog")
    fillEditCreateTaskDialog('edit')
}

/**
 * Deletes the currently selected task by its ID.
 *
 * Calls the deleteTask function with the current task's ID.
 */
function deleteCurrentTask() {
    deleteTask(currentTask.id)
}

function deleteComment(id) {
    deleteData(TASKS_URL + currentTask.id + "/comments/" + id + "/").then(async response => {
        if (!response.ok) {
            let errorArr = extractErrorMessages(response.data)
            showToastMessage(true, errorArr)
        } else {
            currentComments = await getTaskComments(currentTask.id);
            renderDetailTaskComments()
        }
    })
}

/**
 * Deletes a comment by its ID for the current task.
 *
 * Sends a DELETE request to the task comments endpoint.
 * If successful, reloads the comments and updates the UI.
 * If the request fails, displays error messages.
 *
 * @param {number|string} id - The unique identifier of the comment to delete.
 */
function deleteComment(id) {
    deleteData(TASKS_URL + currentTask.id + "/comments/" + id + "/").then(async response => {
        if (!response.ok) {
            let errorArr = extractErrorMessages(response.data)
            showToastMessage(true, errorArr)
        } else {
            currentComments = await getTaskComments(currentTask.id)
            renderDetailTaskComments()
        }
    })
}

/**
 * Populates the task create/edit dialog with the appropriate data and settings.
 *
 * Sets the dialog type attribute, fills the title and description fields,
 * renders the member dropdowns, updates the priority dropdown header,
 * and sets the status selection.
 *
 * @param {string} type - The dialog mode, either "create" or "edit".
 */
function fillEditCreateTaskDialog(type) {
    document.getElementById("create_edit_task_dialog").setAttribute('dialog-type', type)
    fillCreateEditTaskTitleInputDesc()
    renderTaskCreateMemberList()
    setTaskCreateDropdownPrioHeader()
    setSelectAddEditTaskStatusDropdown()
    const desc = document.getElementById('create_edit_task_description');
    if (!desc.dataset.listenerSet) {
        desc.addEventListener('blur', async e => {
            freezeFormValues(e.currentTarget);
            if (document.getElementById('create_edit_task_dialog').getAttribute('dialog-type') === 'edit') {
                await patchData(`${TASKS_URL}${currentTask.id}/`, { description: e.currentTarget.innerHTML });
            }
        }, true);
        desc.dataset.listenerSet = 'true';
    }
    bindPdfButtonsForSfl();
}

    const pdfBtn = document.getElementById('task-pdf-btn');
    const title = (currentBoard?.title || '').toLowerCase();
    const isSflDebrief = title.includes('debriefing') && (title.includes('swiss football league') || title.includes('sfl'));

    if (pdfBtn) {
        if (isSflDebrief) {
            pdfBtn.style.display = 'inline-flex';
            window.exportDebriefingTaskPdf = async () => {
                const descEl = document.getElementById('create_edit_task_description');
                freezeFormValues(descEl); 
                const html = descEl.innerHTML;
                const base = document.getElementById('create_edit_task_title_input').value || 'debriefing';
                const mod = await import('./pdf_export.js'); 
                mod.exportDebriefingTaskPdf(html, base);
            };
        } else {
            pdfBtn.style.display = 'none';
        }
    }

/**
 * Checks whether the current board title matches the pattern
 * for an SFL (Swiss Football League) Debriefing board.
 *
 * The detection is case-insensitive and returns true if:
 * - The title contains "debriefing", AND
 * - The title contains either "swiss football league" or "sfl".
 *
 * @returns {boolean} True if the board title matches the SFL Debriefing pattern, otherwise false.
 */
function isSflDebriefBoardTitle() {
    const t = (currentBoard?.title || '').toLowerCase();
    return t.includes('debriefing') &&
           (t.includes('swiss football league') || t.includes('sfl'));
}

/**
 * Exports the current Debriefing task as a PDF.
 *
 * Determines whether the edit dialog is open or the detail view is active,
 * selects the appropriate description container, and (if in edit mode)
 * freezes form values into the DOM so they are included in the export HTML.
 * Then calls the `exportDebriefingTaskPdf` function from `pdf_export.js`.
 *
 * @async
 * @returns {Promise<void>} Resolves once the export process has been triggered.
 */
async function exportDebriefingTaskPdf() {
    const editOpen = document
        .getElementById('create_edit_task_dialog')
        ?.getAttribute('current_dialog') === 'true';

    const rootId = editOpen
        ? 'create_edit_task_description'
        : 'detail_task_description';

    const el = document.getElementById(rootId);
    if (!el) return;

    if (editOpen) freezeFormValues(el);

    const html = el.innerHTML;
    const baseTitle =
        document.getElementById('create_edit_task_title_input')?.value ||
        currentTask?.title ||
        'debriefing';

    const mod = await import('./pdf_export.js');
    mod.exportDebriefingTaskPdf(html, baseTitle);
}

/**
 * Binds the PDF export buttons for SFL Debriefing boards.
 *
 * - Checks if the current board is an SFL Debriefing board (via {@link isSflDebriefBoardTitle}).
 * - Shows or hides the edit and detail PDF buttons accordingly.
 * - Assigns the {@link exportDebriefingTaskPdf} function to the click handler of each button.
 *
 * @returns {void}
 */
function bindPdfButtonsForSfl() {
    const isSfl = isSflDebriefBoardTitle();
    const editBtn   = document.getElementById('task-pdf-btn');
    const detailBtn = document.getElementById('detail-pdf-btn');

    [editBtn, detailBtn].forEach(btn => {
        if (!btn) return;
        btn.style.display = isSfl ? 'inline-flex' : 'none';
        btn.onclick = exportDebriefingTaskPdf;
    });
}

/**
 * Renders the member dropdown lists for assignee and reviewer in the task create/edit dialog.
 *
 * Populates the dropdowns with current board members and updates the dropdown headers for both roles.
 */
function renderTaskCreateMemberList() {
    document.getElementById("create_edit_task_assignee").innerHTML = getTaskCreateMemberListEntrieTemplate("assignee", currentBoard)
    document.getElementById("create_edit_task_reviewer").innerHTML = getTaskCreateMemberListEntrieTemplate("reviewer", currentBoard)
    setTaskCreateDropdownHeader('assignee')
    setTaskCreateDropdownHeader('reviewer')
}

/**
 * Updates the dropdown header for the assignee or reviewer in the task dialog.
 *
 * If a member is assigned, displays their initials and name;
 * otherwise, shows a default user icon and "unassigned" label.
 *
 * @param {string} type - Either "assignee" or "reviewer".
 */
function setTaskCreateDropdownHeader(type) {
    let headRef = document.getElementById(`create_edit_task_${type}_head`)
    if (currentTask[type]) {
        let initials = getInitials(currentTask[type].fullname)
        headRef.innerHTML = `<div class="profile_circle color_${initials[0]}">${initials}</div><p>${currentTask[type].fullname}</p>`
    } else {
        headRef.innerHTML = `<img src="../../assets/icons/face_icon.svg" alt=""><p>unassigned</p>`
    }
}

/**
 * Unassigns the specified member role (assignee or reviewer) for the current task.
 *
 * Sets the role to null and updates the dropdown header in the task dialog.
 *
 * @param {string} type - The member type to unset ("assignee" or "reviewer").
 */
function unsetMemberAs(type) {
    currentTask[type] = null
    setTaskCreateDropdownHeader(type)
}

/**
 * Assigns a board member as either the assignee or reviewer for the current task.
 *
 * Finds the member by their ID, updates the currentTask object,
 * and updates the corresponding dropdown header.
 *
 * @param {number|string} memberId - The unique identifier of the member.
 * @param {string} type - The member type to set ("assignee" or "reviewer").
 */
function setMemberAs(memberId, type) {
    currentTask[type] = getMemberById(memberId)
    setTaskCreateDropdownHeader(type)
}

/**
 * Finds and returns a member object from the current board by their ID.
 *
 * @param {number|string} id - The unique identifier of the member.
 * @returns {Object|undefined} The member object if found, otherwise undefined.
 */
function getMemberById(id) {
    return currentBoard.members.find(member => member.id == id)
}

/**
 * Finds and returns a task object from the current board by its ID.
 *
 * @param {number|string} id - The unique identifier of the task.
 * @returns {Object|undefined} The task object if found, otherwise undefined.
 */
function getTaskById(id) {
    return currentBoard.tasks.find(task => task.id == id)
}

/**
 * Sets the priority for the current task and updates the priority dropdown header.
 *
 * @param {string} prio - The priority level to assign (e.g., "low", "medium", "high").
 */
function setTaskCreatePrio(prio) {
    currentTask.priority = prio
    setTaskCreateDropdownPrioHeader()
}

/**
 * Updates the priority dropdown header in the task create/edit dialog.
 *
 * Displays the current priority badge and label based on the currentTask's priority.
 */
function setTaskCreateDropdownPrioHeader() {
    let headerRef = document.getElementById('create_edit_task_prio_head')
    headerRef.innerHTML = `<div class="priority-badge" priority="${currentTask.priority}"></div><p>${currentTask.priority}</p>`
}

/**
 * Sets the due date for the current task from the provided input element.
 *
 * @param {HTMLInputElement} element - The input element containing the selected due date.
 */
function setTaskCreateDate(element) {
    currentTask.due_date = element.value
}

/**
 * Switches the visible dialog by updating the 'current_dialog' attribute.
 *
 * Sets all dialogs with the 'current_dialog' attribute to 'false',
 * then sets the specified dialog's attribute to 'true' to make it active.
 *
 * @param {string} currentDialog - The ID of the dialog to activate.
 */
function changeCurrentDialog(currentDialog) {
    const dialogs = document.querySelectorAll('[current_dialog]')
    dialogs.forEach(dialog => {
        dialog.setAttribute('current_dialog', 'false')
    })
    document.getElementById(currentDialog).setAttribute('current_dialog', 'true')
}

/**
 * Validates the task title input for minimum length.
 *
 * Checks if the trimmed value of the input has more than 2 characters.
 * Updates the error state accordingly.
 *
 * @param {HTMLInputElement} element - The input element for the task title.
 * @returns {boolean} True if the title is valid, false otherwise.
 */
function validateCreateEditTaskTitle(element) {
    let valid = element.value.trim().length > 2
    setError(!valid, element.id + "_group")
    return valid
}

/**
 * Validates that a due date has been selected for the task.
 *
 * Checks if the trimmed value of the input is not empty.
 * Updates the error state accordingly.
 *
 * @param {HTMLInputElement} element - The input element for the due date.
 * @returns {boolean} True if a due date is set, false otherwise.
 */
function validateCreateEditTaskDueDate(element) {
    let valid = element.value.trim().length > 0
    setError(!valid, element.id + "_group")
    return valid
}

/**
 * Handles the submission of the create task form.
 *
 * Prevents the default form submission, validates the input fields,
 * and if valid, calls createTask() to create the new task.
 *
 * @param {Event} event - The form submission event.
 * @returns {Promise<void>}
 */
async function submitCreateTask(event) {
    event.preventDefault()
    let newTask = getValidatedTask()
    if (newTask) {
        await createTask(newTask)
    }
}

/**
 * Validates the input fields in the create/edit task dialog and constructs a task object if valid.
 *
 * Checks the title and due date fields for validity.
 * If both are valid, returns a new task object with all relevant properties.
 * If validation fails, returns false.
 *
 * @returns {Object|boolean} The new or updated task object if valid, otherwise false.
 */
function getValidatedTask() {
    let titleRef = document.getElementById('create_edit_task_title_input');
    let dateRef = document.getElementById('create_edit_task_date_input');
    const descElem = document.getElementById('create_edit_task_description');
    freezeFormValues(descElem); // ← Neu: Beschreibung einfrieren

    if (validateCreateEditTaskTitle(titleRef) && validateCreateEditTaskDueDate(dateRef)) {
        let updatedTask = {
            "board": currentBoard.id,
            "title": titleRef.value,
            "description": descElem.innerHTML, // ← Jetzt korrekt eingebunden
            "status": currentTask.status,
            "priority": currentTask.priority,
            "reviewer_id": currentTask.reviewer ? currentTask.reviewer.id : null,
            "assignee_id": currentTask.assignee ? currentTask.assignee.id : null,
            "due_date": dateRef.value
        };
        return updatedTask;
    }
    return false;
}

/**
 * Handles the submission of the edit task form.
 *
 * Validates the input fields and, if valid, updates the current task
 * by calling editTask() with the new values.
 *
 * @returns {Promise<void>}
 */
async function submitEditTask() {
    let updatedTask = getValidatedTask()
    if (updatedTask) {
        await editTask(updatedTask, currentTask.id)
    }
}

/**
 * Sends an update request to the API to edit the task with the given ID.
 *
 * If the update is successful, resets the current task, closes the dialog,
 * and reloads all tasks. If the request fails, displays error messages.
 *
 * @param {Object} updatedTask - The task object containing updated values.
 * @param {number|string} id - The unique identifier of the task to update.
 * @returns {Promise<void>}
 */
async function editTask(updatedTask, id) {
    let response = await patchData(TASKS_URL + id + "/", updatedTask)
    if (!response.ok) {
        let errorArr = extractErrorMessages(response.data)
        showToastMessage(true, errorArr)
    } else {
        cleanCurrentTask()
        toggleOpenId('dialog_wrapper')
        await loadAndRenderTasks()
    }
}

/**
 * Sends a request to the API to create a new task.
 *
 * If the creation is successful, resets the current task, closes the dialog,
 * and reloads all tasks. If the request fails, displays error messages.
 *
 * @param {Object} newTask - The task object to be created.
 * @returns {Promise<void>}
 */
async function createTask(newTask) {
    let response = await postData(TASKS_URL, newTask)
    if (!response.ok) {
        let errorArr = extractErrorMessages(response.data)
        showToastMessage(true, errorArr)
    } else {
        cleanCurrentTask()
        toggleOpenId('dialog_wrapper')
        await loadAndRenderTasks()
    }
}

/**
 * Sets the value of the status dropdown in the create/edit task dialog
 * to match the current task's status.
 */
function setSelectAddEditTaskStatusDropdown() {
    document.getElementById('create_edit_task_dialog_select').value = currentTask.status
}

/**
 * Updates the current task's status based on the selected value in the status dropdown.
 */
function modifyAddEditTaskStatusDropdown() {
    let status = document.getElementById('create_edit_task_dialog_select').value
    currentTask.status = status
}

/**
 * Updates the current task's status using the status selected in the task detail dialog.
 *
 * Calls modifyTaskStatus with the current task's ID and the selected status value.
 *
 * @returns {Promise<void>}
 */
async function modifyTaskStatusDropdown() {
    let status = document.getElementById('task_detail_dialog_select').value
    await modifyTaskStatus(currentTask.id, status)
}

/**
 * Sends a PATCH request to update the status of a task with the given ID.
 *
 * If the update is successful, reloads all tasks.
 * If the request fails, displays error messages.
 *
 * @param {number|string} id - The unique identifier of the task to update.
 * @param {string} status - The new status to assign to the task.
 * @returns {Promise<void>}
 */
async function modifyTaskStatus(id, status) {
    let response = await patchData(TASKS_URL + id + "/", {"status": status})
    if (!response.ok) {
        let errorArr = extractErrorMessages(response.data)
        showToastMessage(true, errorArr)
    } else {
        await loadAndRenderTasks()
    }
}

/**
 * Toggles the visibility of the move button dropdown for a task card.
 *
 * Closes all other move dropdowns, then opens or closes the one for the given element.
 *
 * @param {HTMLElement} element - The move button element to toggle.
 */
function toggleMoveOpen(element) {
    resetAllMoveOpen()
    let isOpen = element.getAttribute('move-open') === 'true'
    element.setAttribute('move-open', !isOpen)
}

/**
 * Closes all move button dropdowns by setting their 'move-open' attribute to 'false'.
 *
 * Useful to ensure only one move dropdown is open at a time on the board.
 */
function resetAllMoveOpen() {
    document.querySelectorAll('.move_btn').forEach(btn => btn.setAttribute('move-open', 'false'))
}

/**
 * Aborts the create/edit task process and closes the dialog.
 *
 * Resets the currentTask object, clears the form fields,
 * and closes the create/edit task dialog.
 */
function abbortCreateEditTask() {
    cleanCurrentTask()
    fillCreateEditTaskTitleInputDesc()
    toggleOpenId('dialog_wrapper')
}

/**
 * Fills the task create/edit dialog fields with the current task's title, due date, and description.
 *
 * Populates the corresponding input elements with the values from currentTask.
 */
function fillCreateEditTaskTitleInputDesc() {
    document.getElementById('create_edit_task_title_input').value = currentTask.title || '';
    document.getElementById('create_edit_task_date_input').value = currentTask.due_date || '';
    document.getElementById('create_edit_task_description').innerHTML = currentTask.description || '';
}

/**
 * Sends a DELETE request to remove the task with the given ID.
 *
 * @param {number|string} id - The unique identifier of the task.
 * @returns {Promise<void>}
 */
async function deleteTask(id) {
    let response = await deleteData(TASKS_URL + id + "/");
    if (!response.ok) {
        let errorArr = extractErrorMessages(response.data);
        showToastMessage(true, errorArr);
    } else {
        cleanCurrentTask();
        toggleOpenId("dialog_wrapper");
        await loadAndRenderTasks();
    }
}

/**
 * Loads the latest board data and renders all tasks in the UI.
 *
 * Fetches the board data from the API and updates the task lists.
 *
 * @returns {Promise<void>}
 */
async function loadAndRenderTasks() {
    await setBoard()
    renderAllTasks()
}

/**
 * Renders all tasks on the board, optionally filtering by the search input value.
 *
 * If the search bar has input, only tasks matching the search are rendered.
 * Otherwise, all tasks are shown, grouped by status columns.
 */
function renderAllTasks() {
    let searchRef = document.getElementById('searchbar_tasks')
    let taskList = []
    if (searchRef.value.length > 0) {
        taskList = searchInTasks(searchRef.value)
    } else {
        taskList = currentBoard.tasks
    }
    let statii = ['to-do', 'in-progress', 'review', 'done']
    statii.forEach(status => {
        let filteredList = taskList.filter(task => task.status == status)
        renderSingleColumn(status, filteredList)
    })
}

/**
 * Renders a single Kanban column for a given status with the provided list of tasks.
 *
 * Clears the column and then appends each task using getBoardCardTemplate().
 *
 * @param {string} status - The status of the column (e.g., "to-do", "in-progress", "review", "done").
 * @param {Array<Object>} filteredList - The list of task objects to display in the column.
 */
function renderSingleColumn(status, filteredList) {
    document.getElementById(`${status}_column`).innerHTML = ""
    filteredList.forEach(task => {
        document.getElementById(`${status}_column`).innerHTML += getBoardCardTemplate(task)
    })
}

/**
 * Searches for tasks in the current board that match the given search term in their title or description.
 *
 * Performs a case-insensitive search.
 *
 * @param {string} searchTerm - The term to search for.
 * @returns {Array<Object>} Array of task objects matching the search term.
 */
function searchInTasks(searchTerm) {
    const lowerCaseSearch = searchTerm.toLowerCase()

    return currentBoard.tasks.filter(task => {
        const titleMatch = task.title?.toLowerCase().includes(lowerCaseSearch)
        const descriptionMatch = task.description?.toLowerCase().includes(lowerCaseSearch)
        return titleMatch || descriptionMatch
    })
}

/**
 * Aktualisiert Board‑Einstellungen (z. B. Titel) via API.
 * Re‑evaluates Graphics‑Heuristik und toggelt Header‑Buttons
 * (GFX‑Manual, Kits, Roster) nach erfolgreichem Update.
 *
 * @param {Object} data
 * @returns {Promise<Object>}
 */
async function updateBoard(data) {
  let response = await patchData(BOARDS_URL + currentSettingsBoard.id + "/", data);
  if (!response.ok) {
    let errorArr = extractErrorMessages(response.data);
    showToastMessage(true, errorArr);
  } else {
    currentBoard.title = response.data.title;
    renderTitle();
    updateGfxManualButton();
    updateKitsButton();
    updateRosterButton(); // ← NEU
  }
  return response;
}

/**
 * Deletes the current board using the API and handles UI updates.
 *
 * If the deletion is successful, redirects to the boards page.
 * If the request fails, displays error messages.
 * Always clears any persistent toast notifications.
 *
 * @returns {Promise<void>}
 */
async function deleteBoard() {
    let response = await deleteData(BOARDS_URL + currentSettingsBoard.id + "/")
    if(response.ok){
        window.location.href = "../../pages/boards/"
    } else {
        let errorArr = extractErrorMessages(response.data)
        showToastMessage(true, errorArr)
    }
    deleteLastingToast()
}

/**
 * Opens the native date picker for the specified input element.
 *
 * Finds the element by its ID and calls showPicker() on its next sibling (the date input).
 *
 * @param {string} element - The ID of the reference element preceding the date input.
 */
function triggerDateInput(element) {
    document.getElementById(element).nextElementSibling.showPicker()
}

/**
 * Opens the board settings dialog for editing the current board.
 *
 * Sets the dialog's current_dialog attribute to "true" and loads the board settings.
 *
 * @returns {Promise<void>}
 */
async function openEditBoardDialog() {
    document.getElementById("edit_board_dialog").setAttribute("current_dialog", "true")
    openBoardSettingsDialog(currentBoard.id)
}

/* ------------------------------------------------------------------ */
/*  Serializes inputs & selects in the description area                */
/* ------------------------------------------------------------------ */
/**
 * Writes the current state of all form controls
 * (checkbox, radio, select, input[type=text|date|number|...], textarea)
 * back into the DOM as attributes so that `element.innerHTML` contains the
 * actual, user‑edited values (useful for exports, cloning, or persistence).
 *
 * - For checkboxes/radios: toggles the `checked` attribute.
 * - For text/number/date inputs: mirrors the live value into the `value` attribute.
 * - For selects: marks the currently selected `<option>` elements via `selected`.
 * - For textareas: moves the `.value` into textContent so the serialized HTML includes it.
 *
 * @param {HTMLElement} root - The editor container that holds the form elements.
 * @returns {void}
 */
function freezeFormValues(root) {
    if (!root) return;

    // Checkboxes & radio buttons → reflect live state in the `checked` attribute
    root.querySelectorAll('input[type="checkbox"],input[type="radio"]')
        .forEach(inp => {
            if (inp.checked) {
                inp.setAttribute('checked', '');
            } else {
                inp.removeAttribute('checked');
            }
        });

    // Text/number/date/... inputs → mirror `.value` into the `value` attribute
    root.querySelectorAll('input:not([type="checkbox"]):not([type="radio"])')
        .forEach(inp => {
            inp.setAttribute('value', inp.value);
        });

    // Select elements → mark the selected <option> via the `selected` attribute
    root.querySelectorAll('select').forEach(sel => {
        Array.from(sel.options).forEach(opt => {
            if (opt.selected) {
                opt.setAttribute('selected', '');
            } else {
                opt.removeAttribute('selected');
            }
        });
    });

    // Textareas → ensure textContent matches the current `.value`
    root.querySelectorAll('textarea').forEach(ta => {
        ta.textContent = ta.value || ta.textContent;
    });
}

/* ───────── Our‑Portfolio Marquee ───────── */
/**
 * Initializes the marquee for the `.portfolio-track` list.
 * Rebuilds the track from its original items, inserts a banner after every 7 items,
 * duplicates the sequence for an infinite loop, and sets CSS variables for distance
 * and duration based on the computed width.
 *
 * Expects accompanying CSS to animate using:
 *   --marquee-distance and --marquee-duration
 *
 * @returns {void}
 */
function initPortfolioMarquee() {
    const track = document.querySelector('.portfolio-track');
    if (!track) return;

    /* 1. Collect original items */
    const originalItems = Array.from(track.children).map(li => li.textContent.trim());

    /* 2. Clear the track & rebuild */
    track.innerHTML = '';
    let counter = 0;

    const bannerHTML = `
        <span class="portfolio-banner">
            <svg class="portfolio-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 
                       2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM10 4h4v2h-4V4zm10 
                       14H4V8h16v10z"/>
            </svg>
            OUR PORTFOLIO
        </span>`;

    originalItems.forEach((txt, idx) => {
        /* Create the event item */
        const li = document.createElement('li');
        li.textContent = txt;
        if (idx % 2 === 1) li.classList.add('portfolio-item-alt');   // alternate highlight
        track.appendChild(li);
        counter++;

        /* Insert a banner after every 7 items */
        if (counter % 7 === 0) {
            const bannerLi = document.createElement('li');
            bannerLi.innerHTML = bannerHTML;
            track.appendChild(bannerLi);
        }
    });

    /* 3. Duplicate sequence → infinite loop */
    track.innerHTML += track.innerHTML;

    /* 4. Set marquee CSS variables (distance & duration) */
    const SPEED = 60;                       // px / second
    const trackWidth = track.scrollWidth / 2;
    const duration = trackWidth / SPEED;

    track.style.setProperty('--marquee-distance', `${trackWidth}px`);
    track.style.setProperty('--marquee-duration', `${duration}s`);
}

/* After DOM load, initialize the marquee */
window.addEventListener('load', initPortfolioMarquee);