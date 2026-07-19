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
    prehideGraphicsOnlyButtons();

    await setBoard();
    window.currentBoard = currentBoard;
    cleanCurrentTask();
    renderAllTasks();
    renderMemberList();
    renderTitle();
    renderBoardSummary();

    updateGfxManualButton();
    updateKitsButton();
    updateRosterButton();

    await documentInitLibrary();

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
    const title = currentBoard?.title || 'Board'
    document.getElementById('board_title_link').innerText = title
    document.getElementById('board_title').innerText = title
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
    ['gfx-manual-btn', 'gfx-kits-btn', 'gfx-roster-btn'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.hidden = true;           // semantisch
            el.style.display = 'none';  // visuell
        }
    });

    // Evtl. bereits injizierte Kits-Buttons mitsteuern
    document.querySelectorAll('.gfx-kits-btn, .gfx-roster-btn').forEach((el) => {
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
    window.currentBoard = currentBoard
    renderAllTasks()
    renderBoardSummary()
}

/**
 * Updates the compact board metrics displayed in the page hero.
 */
function renderBoardSummary() {
    const tasks = currentBoard?.tasks || []
    const members = currentBoard?.members || []
    const done = tasks.filter(task => task.status === 'done').length
    const values = {
        board_task_count: tasks.length,
        board_done_count: done,
        board_member_count: members.length
    }

    Object.entries(values).forEach(([id, value]) => {
        const element = document.getElementById(id)
        if (element) element.innerText = value
    })
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
    if (searchRef?.value.length > 0) {
        taskList = searchInTasks(searchRef.value)
    } else {
        taskList = currentBoard.tasks || []
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
    const column = document.getElementById(`${status}_column`)
    if (!column) return

    column.innerHTML = filteredList.length
        ? filteredList.map(task => getBoardCardTemplate(task)).join('')
        : `<li class="board-column-empty">No tasks in this stage.</li>`
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

    return (currentBoard.tasks || []).filter(task => {
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
    renderBoardSummary();
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

/* ========================================================================== */
/*  CH / AT assortment tool document library (shared backend storage)         */
/* ========================================================================== */

const documentMaxFileSize = 10 * 1024 * 1024;

const documentMarketCatalog = Object.freeze({
    CH: Object.freeze({ code: 'CH', label: 'Switzerland' }),
    AT: Object.freeze({ code: 'AT', label: 'Austria' })
});

const documentTypeCatalog = Object.freeze({
    booklet: Object.freeze({ label: 'Booklet', mark: 'BK', fileName: 'booklet.html' }),
    'review-model': Object.freeze({ label: 'Review Model', mark: 'RM', fileName: 'review-model.html' }),
    'tracking-dashboard': Object.freeze({ label: 'Tracking Dashboard', mark: 'TD', fileName: 'tracking-dashboard.html' }),
    online: Object.freeze({ label: 'Online', mark: 'ON', fileName: 'online.html' })
});

let documentSelectedMarket = 'CH';
let documentSelectedType = 'booklet';
let documentSelectedFile = null;
let documentRecords = [];
let documentStorageReady = false;
let documentBackendPending = true;
let documentLoadSequence = 0;
let documentPreviewReturnFocus = null;
let documentPreviewSequence = 0;

/**
 * Initializes the shared document library after the current board was loaded.
 * Safe to call more than once.
 *
 * Expected DOM IDs:
 *  - document_period (required, input[type="month"])
 *  - document_file_input (required, input[type="file"])
 *  - document_dropzone (required)
 *  - document_upload_button (required)
 *  - document_selected_file (optional)
 *  - document_status (optional)
 *  - document_archive_list (required)
 *  - document_archive_filter (optional, input[type="month"])
 *  - document_archive_count (optional)
 *  - document_choose_file_button (optional)
 *  - document_filter_clear_button (optional)
 *
 * @returns {Promise<void>}
 */
async function documentInitLibrary() {
    const periodInput = document.getElementById('document_period');
    const fileInput = document.getElementById('document_file_input');
    const dropzone = document.getElementById('document_dropzone');
    const uploadButton = document.getElementById('document_upload_button');
    const archiveList = document.getElementById('document_archive_list');

    if (!periodInput || !fileInput || !dropzone || !uploadButton || !archiveList) {
        console.warn('[Documents] Document-library markup is incomplete.');
        return;
    }

    documentConfigureStatusRegion();
    documentBindArchiveEvents();
    documentRenderSelection();
    documentRenderToolStatus();
    documentRenderArchive();
    documentUpdateUploadState();
    documentSetStorageBadge('loading');

    const boardId = documentGetBoardId();
    if (!boardId) {
        documentSetStatus('The board must be loaded before the document library can start.', 'error');
        return;
    }

    try {
        await documentLoadArchive();
        documentStorageReady = true;
        documentBackendPending = false;
        documentSetStatus('Shared document library ready.', 'info');
    } catch (error) {
        documentHandleLibraryUnavailable(error, 'The shared document library could not be opened.');
    }

    documentRenderToolStatus();
    documentRenderArchive();
    documentUpdateUploadState();
}

/**
 * Adds all UI listeners exactly once.
 *
 * @returns {void}
 */
function documentBindArchiveEvents() {
    const periodInput = document.getElementById('document_period');
    const salesDateInput = document.getElementById('document_sales_date');
    const fileInput = document.getElementById('document_file_input');
    const dropzone = document.getElementById('document_dropzone');
    const chooseButton = document.getElementById('document_choose_file_button');
    const uploadButton = document.getElementById('document_upload_button');
    const archiveList = document.getElementById('document_archive_list');
    const filterInput = document.getElementById('document_archive_filter');
    const clearFilterButton = document.getElementById('document_filter_clear_button');
    const resetButton = document.getElementById('document_reset_btn');

    if (periodInput && !periodInput.dataset.documentBound) {
        periodInput.addEventListener('change', () => {
            documentSelectedFile = null;
            if (fileInput) fileInput.value = '';
            documentRenderSelectedFile();
            documentUpdateUploadState();
            documentSetStatus(
                documentIsValidPeriod(periodInput.value)
                    ? `${documentGetTypeLabel()} · ${documentFormatPeriod(periodInput.value)} selected for ${documentGetMarketLabel()}.`
                    : 'Select an edition month before choosing an HTML file.',
                'info'
            );
        });
        periodInput.dataset.documentBound = 'true';
    }

    if (fileInput && !fileInput.dataset.documentBound) {
        fileInput.setAttribute('accept', '.html,.htm,text/html');
        fileInput.addEventListener('change', () => documentHandleFiles(fileInput.files));
        fileInput.dataset.documentBound = 'true';
    }

    if (salesDateInput && !salesDateInput.dataset.documentBound) {
        salesDateInput.addEventListener('change', () => {
            const value = salesDateInput.value;
            documentUpdateUploadState();
            documentSetStatus(
                value
                    ? `Sales data status set to ${documentFormatSalesDate(value)}.`
                    : 'Sales data date is required for every uploaded edition.',
                'info'
            );
        });
        salesDateInput.dataset.documentBound = 'true';
    }

    if (dropzone && !dropzone.dataset.documentBound) {
        dropzone.addEventListener('click', event => {
            if (event.target.closest('button, a, input, label')) return;
            documentOpenFilePicker();
        });

        dropzone.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                documentOpenFilePicker();
            }
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, event => {
                event.preventDefault();
                event.stopPropagation();
                dropzone.classList.add('is-dragover');
            });
        });

        ['dragleave', 'dragend'].forEach(eventName => {
            dropzone.addEventListener(eventName, event => {
                event.preventDefault();
                event.stopPropagation();
                if (eventName === 'dragend' || !dropzone.contains(event.relatedTarget)) {
                    dropzone.classList.remove('is-dragover');
                }
            });
        });

        dropzone.addEventListener('drop', event => {
            event.preventDefault();
            event.stopPropagation();
            dropzone.classList.remove('is-dragover');
            documentHandleFiles(event.dataTransfer?.files || []);
        });

        dropzone.dataset.documentBound = 'true';
    }

    if (chooseButton && !chooseButton.dataset.documentBound) {
        chooseButton.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            documentOpenFilePicker();
        });
        chooseButton.dataset.documentBound = 'true';
    }

    if (uploadButton && !uploadButton.dataset.documentBound) {
        uploadButton.addEventListener('click', documentSaveSelectedFile);
        uploadButton.dataset.documentBound = 'true';
    }

    if (filterInput && !filterInput.dataset.documentBound) {
        filterInput.addEventListener('change', documentRenderArchive);
        filterInput.dataset.documentBound = 'true';
    }

    if (clearFilterButton && !clearFilterButton.dataset.documentBound) {
        clearFilterButton.addEventListener('click', event => {
            event.preventDefault();
            if (filterInput) filterInput.value = '';
            documentRenderArchive();
        });
        clearFilterButton.dataset.documentBound = 'true';
    }

    if (resetButton && !resetButton.dataset.documentBound) {
        resetButton.addEventListener('click', documentResetSelection);
        resetButton.dataset.documentBound = 'true';
    }

    if (archiveList && !archiveList.dataset.documentBound) {
        archiveList.addEventListener('click', documentHandleArchiveAction);
        archiveList.dataset.documentBound = 'true';
    }

    document.querySelectorAll('[data-document-market]').forEach(button => {
        if (button.dataset.documentMarketBound) return;
        button.addEventListener('click', () => documentSelectMarket(button.dataset.documentMarket));
        button.dataset.documentMarketBound = 'true';
    });

    document.querySelectorAll('[data-document-type]').forEach(button => {
        if (button.dataset.documentTypeBound) return;
        button.addEventListener('click', event => {
            if (event.target.closest('[data-document-action]')) return;
            documentSelectType(button.dataset.documentType);
        });
        button.dataset.documentTypeBound = 'true';
    });

    documentBindTabKeyboard('.document-market-tabs', '[data-document-market]');
    documentBindTabKeyboard('.document-tool-grid', '[data-document-type]');

    const previewDialog = document.getElementById('document_preview_dialog');
    document.querySelectorAll('[data-document-preview-close]').forEach(previewClose => {
        if (previewClose.dataset.documentBound) return;
        previewClose.addEventListener('click', documentClosePreview);
        previewClose.dataset.documentBound = 'true';
    });

    if (previewDialog && !previewDialog.dataset.documentBound) {
        previewDialog.addEventListener('cancel', event => {
            event.preventDefault();
            documentClosePreview();
        });
        previewDialog.addEventListener('close', documentClearPreview);
        previewDialog.addEventListener('click', event => {
            if (event.target === previewDialog) documentClosePreview();
        });
        previewDialog.dataset.documentBound = 'true';
    }

    if (!document.documentElement.dataset.documentPreviewKeyBound) {
        document.addEventListener('keydown', event => {
            const activePreview = document.getElementById('document_preview_dialog');
            if (event.key === 'Escape' && activePreview && !activePreview.hidden) {
                event.preventDefault();
                documentClosePreview();
            }
        });
        document.documentElement.dataset.documentPreviewKeyBound = 'true';
    }
}

/**
 * Adds arrow-key, Home and End navigation to one accessible tab list.
 *
 * @param {string} listSelector
 * @param {string} tabSelector
 * @returns {void}
 */
function documentBindTabKeyboard(listSelector, tabSelector) {
    const tabList = document.querySelector(listSelector);
    if (!tabList || tabList.dataset.documentKeyboardBound) return;

    tabList.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;

        const tabs = Array.from(tabList.querySelectorAll(tabSelector));
        if (!tabs.length) return;

        const currentIndex = Math.max(0, tabs.indexOf(document.activeElement));
        let nextIndex = currentIndex;

        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % tabs.length;
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        }

        event.preventDefault();
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
    });

    tabList.dataset.documentKeyboardBound = 'true';
}

/**
 * Selects one market and refreshes the shared upload/archive workspace.
 *
 * @param {string} market
 * @returns {void}
 */
function documentSelectMarket(market) {
    const normalized = String(market || '').toUpperCase();
    if (!documentMarketCatalog[normalized]) return;

    const changed = normalized !== documentSelectedMarket;
    documentSelectedMarket = normalized;
    if (changed) {
        documentClearPendingSelection();
        const filter = document.getElementById('document_archive_filter');
        if (filter) filter.value = '';
    }

    documentRenderSelection();
    documentRenderToolStatus();
    documentRenderArchive();
    documentSetStatus(`${documentGetMarketLabel()} selected. Choose one of the four tools.`, 'info');
}

/**
 * Selects one of the four assortment tools.
 *
 * @param {string} type
 * @returns {void}
 */
function documentSelectType(type) {
    const normalized = documentNormalizeType(type);
    if (!documentTypeCatalog[normalized]) return;

    const changed = normalized !== documentSelectedType;
    documentSelectedType = normalized;
    if (changed) {
        documentClearPendingSelection();
        const filter = document.getElementById('document_archive_filter');
        if (filter) filter.value = '';
    }

    documentRenderSelection();
    documentRenderToolStatus();
    documentRenderArchive();
    documentSetStatus(`${documentGetTypeLabel()} selected for ${documentGetMarketLabel()}.`, 'info');
}

/**
 * Reflects active country/tool state in labels, ARIA attributes and cards.
 *
 * @returns {void}
 */
function documentRenderSelection() {
    document.querySelectorAll('[data-document-market]').forEach(button => {
        const active = String(button.dataset.documentMarket || '').toUpperCase() === documentSelectedMarket;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
        if (button.getAttribute('role') === 'tab') {
            button.removeAttribute('aria-pressed');
            button.tabIndex = active ? 0 : -1;
        } else {
            button.setAttribute('aria-pressed', String(active));
        }
    });

    document.querySelectorAll('[data-document-type]').forEach(button => {
        const active = documentNormalizeType(button.dataset.documentType) === documentSelectedType;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
        if (button.getAttribute('role') === 'tab') {
            button.removeAttribute('aria-pressed');
            button.tabIndex = active ? 0 : -1;
        } else {
            button.setAttribute('aria-pressed', String(active));
        }
    });

    const marketOutput = document.getElementById('document_selected_market');
    const toolOutput = document.getElementById('document_selected_tool');
    const flagOutput = document.getElementById('document_selected_flag');
    const badgeOutput = document.getElementById('document_selection_badge');
    const summaryOutput = document.getElementById('document_selection_summary');
    const hub = document.getElementById('document_hub');

    if (marketOutput) marketOutput.textContent = documentGetMarketLabel();
    if (toolOutput) toolOutput.textContent = documentGetTypeLabel();
    if (flagOutput) {
        flagOutput.src = `../../assets/icons/flag-${documentSelectedMarket.toLowerCase()}.svg.webp`;
        flagOutput.alt = `${documentGetMarketLabel()} flag`;
    }
    if (badgeOutput) badgeOutput.textContent = `${documentSelectedMarket} · ${documentGetTypeLabel()}`;
    if (summaryOutput) {
        summaryOutput.textContent = `Add a monthly ${documentGetTypeLabel()} HTML edition and record the sales-data date it contains.`;
    }
    if (hub) {
        hub.dataset.selectedMarket = documentSelectedMarket;
        hub.dataset.selectedType = documentSelectedType;
    }
}

/**
 * Renders availability and data-status values for all four tools in the
 * currently selected country.
 *
 * @returns {void}
 */
function documentRenderToolStatus() {
    Object.keys(documentTypeCatalog).forEach(type => {
        const records = documentGetRecords(documentSelectedMarket, type);
        const latest = records[0] || null;
        let state = 'empty';
        let statusLabel = 'No edition';

        if (!documentStorageReady) {
            state = 'offline';
            statusLabel = documentBackendPending ? 'Backend pending' : 'Unavailable';
        } else if (latest) {
            state = 'available';
            statusLabel = 'Available';
        }

        documentSetText(documentGetToolStatusId(type, 'status'), statusLabel);
        documentSetText(
            documentGetToolStatusId(type, 'latest'),
            latest ? documentFormatPeriod(latest.period) : '—'
        );
        documentSetText(
            documentGetToolStatusId(type, 'sales_date'),
            latest
                ? latest.salesDate ? documentFormatSalesDate(latest.salesDate) : 'Not provided'
                : '—'
        );
        documentSetText(
            documentGetToolStatusId(type, 'updated'),
            latest ? documentFormatDate(latest.updatedAt || latest.createdAt) : '—'
        );
        documentSetText(
            documentGetToolStatusId(type, 'count'),
            `${records.length} edition${records.length === 1 ? '' : 's'}`
        );

        document.querySelectorAll(`[data-document-type="${type}"]`).forEach(card => {
            card.dataset.state = state;
        });
    });
}

/**
 * Returns sorted records for one market/tool combination.
 *
 * @param {string} market
 * @param {string} type
 * @returns {Array<Object>}
 */
function documentGetRecords(market = documentSelectedMarket, type = documentSelectedType) {
    const normalizedMarket = String(market || '').toUpperCase();
    const normalizedType = documentNormalizeType(type);
    return documentRecords.filter(record => (
        record.market === normalizedMarket && record.type === normalizedType
    ));
}

/**
 * Converts historic or backend-provided type aliases to the frontend contract.
 *
 * @param {*} value
 * @returns {string}
 */
function documentNormalizeType(value) {
    const normalized = String(value || '').trim().toLowerCase().replace(/_/g, '-');
    return normalized === 'strategic-assortment' ? 'booklet' : normalized;
}

function documentGetMarketLabel() {
    return documentMarketCatalog[documentSelectedMarket]?.label || documentSelectedMarket;
}

function documentGetTypeLabel(type = documentSelectedType) {
    return documentTypeCatalog[documentNormalizeType(type)]?.label || String(type || 'Document');
}

function documentGetToolStatusId(type, field) {
    return `document_tool_${documentNormalizeType(type).replace(/-/g, '_')}_${field}`;
}

function documentSetText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value ?? '');
}

/** Expands or collapses the CH/AT tool document workspace. */
function toggleDocumentHub(forceOpen) {
    const hub = document.getElementById('document_hub');
    const button = document.getElementById('document-toggle-btn');
    if (!hub) return;

    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : hub.hidden;
    hub.hidden = !shouldOpen;
    button?.setAttribute('aria-expanded', String(shouldOpen));
    button?.classList.toggle('is-active', shouldOpen);

    if (shouldOpen) {
        const wasReady = documentStorageReady;
        void documentLoadArchive()
            .then(() => {
                documentStorageReady = true;
                documentBackendPending = false;
                documentRenderToolStatus();
                documentRenderArchive();
                documentUpdateUploadState();
                if (!wasReady) documentSetStatus('Shared document library ready.', 'info');
            })
            .catch(error => {
                documentHandleLibraryUnavailable(error, 'The shared document library could not be refreshed.');
            });
        window.requestAnimationFrame(() => {
            hub.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
}

/** Backwards-compatible alias for old cached markup. */
function toggleBookletHub(forceOpen) {
    toggleDocumentHub(forceOpen);
}

/**
 * Clears the pending month/file selection without deleting archived editions.
 */
function documentResetSelection() {
    documentClearPendingSelection();
    documentSetStatus('Selection reset. Choose an edition month to continue.', 'info');
}

/**
 * Clears only the pending upload; centrally stored editions remain untouched.
 *
 * @returns {void}
 */
function documentClearPendingSelection() {
    const periodInput = document.getElementById('document_period');
    const salesDateInput = document.getElementById('document_sales_date');
    const fileInput = document.getElementById('document_file_input');
    documentSelectedFile = null;
    if (periodInput) periodInput.value = '';
    if (salesDateInput) salesDateInput.value = '';
    if (fileInput) fileInput.value = '';
    documentRenderSelectedFile();
    documentUpdateUploadState();
}

/**
 * Ensures the status element works for screen readers even if the attributes
 * were omitted from the HTML.
 *
 * @returns {void}
 */
function documentConfigureStatusRegion() {
    const status = document.getElementById('document_status');
    if (!status) return;
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-atomic', 'true');
}

/**
 * Returns the current board ID as a string.
 *
 * @returns {string}
 */
function documentGetBoardId() {
    if (window.currentBoard?.id !== undefined && window.currentBoard?.id !== null) {
        return String(window.currentBoard.id);
    }
    if (typeof currentBoard !== 'undefined' && currentBoard?.id !== undefined && currentBoard?.id !== null) {
        return String(currentBoard.id);
    }
    if (typeof getParamFromUrl === 'function') {
        const paramId = getParamFromUrl('id');
        return paramId === undefined || paramId === null ? '' : String(paramId);
    }
    return '';
}

/**
 * Builds an absolute URL below the configured API base.
 *
 * @param {string} endpoint
 * @returns {string}
 */
function documentApiUrl(endpoint) {
    const base = typeof API_BASE_URL === 'string' && API_BASE_URL
        ? API_BASE_URL
        : '/api/';
    return `${base.replace(/\/+$/, '')}/${String(endpoint || '').replace(/^\/+/, '')}`;
}

/**
 * Resolves a server-provided URL against the configured API host.
 *
 * @param {string} value
 * @param {string} fallbackEndpoint
 * @returns {string}
 */
function documentResolveApiUrl(value, fallbackEndpoint) {
    const fallback = documentApiUrl(fallbackEndpoint);
    if (!value) return fallback;

    try {
        const apiBase = new URL(documentApiUrl(''), window.location.href);
        const candidate = String(value);
        const resolved = new URL(candidate, candidate.startsWith('/') ? apiBase.origin : apiBase.href);
        return resolved.origin === apiBase.origin ? resolved.href : fallback;
    } catch (_) {
        return fallback;
    }
}

/**
 * Returns Token-authenticated headers without setting Content-Type for FormData.
 *
 * @returns {Object<string,string>}
 */
function documentAuthHeaders() {
    return typeof createHeaders === 'function' ? createHeaders() : {};
}

/**
 * Reads the most useful validation/API error from a failed response payload.
 *
 * @param {Response} response
 * @returns {Promise<string>}
 */
async function documentReadResponseError(response) {
    let payload = null;
    try {
        payload = await response.clone().json();
    } catch (_) {
        try {
            payload = await response.text();
        } catch (_) {
            payload = null;
        }
    }

    if (typeof payload === 'string' && payload.trim()) return payload.trim();
    if (payload && typeof payload === 'object') {
        if (typeof payload.detail === 'string') return payload.detail;
        const messages = typeof extractErrorMessages === 'function'
            ? extractErrorMessages(payload)
            : Object.values(payload).flat().map(String);
        if (messages.length) return messages.join(' ');
    }
    return `Request failed (HTTP ${response.status}).`;
}

/**
 * Creates an Error that keeps the HTTP status for graceful frontend-first
 * handling of a not-yet-installed API endpoint.
 *
 * @param {Response} response
 * @returns {Promise<Error>}
 */
async function documentCreateApiError(response) {
    const error = new Error(await documentReadResponseError(response));
    error.status = response.status;
    return error;
}

/**
 * Normalizes backend snake_case metadata for the existing archive UI.
 *
 * @param {Object} record
 * @returns {Object}
 */
function documentNormalizeRecord(record) {
    const id = record?.id === undefined || record?.id === null ? '' : String(record.id);
    const type = documentNormalizeType(record?.document_type || record?.type || 'booklet');
    const market = String(record?.market || record?.country || 'CH').toUpperCase();
    return {
        id,
        boardId: record?.board === undefined || record?.board === null ? '' : String(record.board),
        market: documentMarketCatalog[market] ? market : 'CH',
        type: documentTypeCatalog[type] ? type : 'booklet',
        period: record?.period || '',
        salesDate: record?.sales_date || record?.sales_data_date || record?.salesDate || '',
        fileName: record?.file_name || documentTypeCatalog[type]?.fileName || 'document.html',
        mimeType: record?.mime_type || 'text/html',
        size: Number(record?.size) || 0,
        uploadedBy: record?.uploaded_by || null,
        createdAt: record?.created_at || '',
        updatedAt: record?.updated_at || record?.created_at || '',
        contentUrl: documentResolveApiUrl(
            record?.content_url,
            `documents/${encodeURIComponent(id)}/content/`
        )
    };
}

/**
 * Loads the archive records for the currently opened board.
 *
 * @returns {Promise<void>}
 */
async function documentLoadArchive() {
    const boardId = documentGetBoardId();
    if (!boardId) return;
    const requestSequence = ++documentLoadSequence;

    const response = await fetch(
        documentApiUrl(`boards/${encodeURIComponent(boardId)}/documents/`),
        { method: 'GET', headers: documentAuthHeaders() }
    );
    if (!response.ok) {
        throw await documentCreateApiError(response);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : payload?.results;
    if (!Array.isArray(rows)) {
        throw new Error('The document archive returned an invalid response.');
    }

    if (requestSequence !== documentLoadSequence) return;

    documentRecords = rows.map(documentNormalizeRecord);
    documentSortRecords();
    documentStorageReady = true;
    documentBackendPending = false;
    documentSetStorageBadge('ready');
    documentRenderToolStatus();
    documentRenderArchive();
    documentUpdateUploadState();
}

/**
 * Sorts newest periods first, with newest replacement first as a tie-breaker.
 *
 * @returns {void}
 */
function documentSortRecords() {
    documentRecords.sort((first, second) => {
        const periodOrder = String(second.period || '').localeCompare(String(first.period || ''));
        if (periodOrder !== 0) return periodOrder;
        return String(second.updatedAt || second.createdAt || '')
            .localeCompare(String(first.updatedAt || first.createdAt || ''));
    });
}

/**
 * Opens the file picker only after a valid period was selected.
 *
 * @returns {void}
 */
function documentOpenFilePicker() {
    const periodInput = document.getElementById('document_period');
    const fileInput = document.getElementById('document_file_input');

    if (!periodInput || !documentIsValidPeriod(periodInput.value)) {
        documentSetStatus(`Select the ${documentGetTypeLabel()} edition month first.`, 'error');
        periodInput?.focus();
        return;
    }

    fileInput?.click();
}

/**
 * Validates one dropped/selected HTML file and stores it as the pending upload.
 *
 * @param {FileList|File[]} files
 * @returns {void}
 */
function documentHandleFiles(files) {
    const periodInput = document.getElementById('document_period');
    const fileInput = document.getElementById('document_file_input');
    const fileArray = Array.from(files || []);

    if (!periodInput || !documentIsValidPeriod(periodInput.value)) {
        documentSelectedFile = null;
        if (fileInput) fileInput.value = '';
        documentRenderSelectedFile();
        documentUpdateUploadState();
        documentSetStatus(`Select the ${documentGetTypeLabel()} edition month before adding a file.`, 'error');
        periodInput?.focus();
        return;
    }

    if (fileArray.length !== 1) {
        documentSelectedFile = null;
        if (fileInput) fileInput.value = '';
        documentRenderSelectedFile();
        documentUpdateUploadState();
        documentSetStatus('Choose exactly one HTML file.', 'error');
        return;
    }

    const file = fileArray[0];
    const lowerName = String(file.name || '').toLowerCase();
    const hasAllowedExtension = lowerName.endsWith('.html') || lowerName.endsWith('.htm');

    if (!hasAllowedExtension) {
        documentSelectedFile = null;
        if (fileInput) fileInput.value = '';
        documentRenderSelectedFile();
        documentUpdateUploadState();
        documentSetStatus('Only .html or .htm tool files are accepted.', 'error');
        return;
    }

    if (file.size <= 0) {
        documentSelectedFile = null;
        if (fileInput) fileInput.value = '';
        documentRenderSelectedFile();
        documentUpdateUploadState();
        documentSetStatus('The selected HTML file is empty.', 'error');
        return;
    }

    if (file.size > documentMaxFileSize) {
        documentSelectedFile = null;
        if (fileInput) fileInput.value = '';
        documentRenderSelectedFile();
        documentUpdateUploadState();
        documentSetStatus('The HTML tool file must not be larger than 10 MB.', 'error');
        return;
    }

    documentSelectedFile = file;
    documentRenderSelectedFile();
    documentUpdateUploadState();
    documentSetStatus(
        `${file.name} is ready as ${documentGetTypeLabel()} · ${documentSelectedMarket} · ${documentFormatPeriod(periodInput.value)}.`,
        'success'
    );
}

/**
 * Updates the pending-file summary.
 *
 * @returns {void}
 */
function documentRenderSelectedFile() {
    const output = document.getElementById('document_selected_file');
    const dropzone = document.getElementById('document_dropzone');
    if (!output) return;

    if (!documentSelectedFile) {
        output.textContent = 'No HTML file selected';
        output.removeAttribute('title');
        output.classList.remove('has-file');
        dropzone?.classList.remove('has-file');
        return;
    }

    output.textContent = `${documentSelectedFile.name} · ${documentFormatBytes(documentSelectedFile.size)}`;
    output.title = documentSelectedFile.name;
    output.classList.add('has-file');
    dropzone?.classList.add('has-file');
}

/**
 * Enables upload only when storage, period and file are ready.
 *
 * @returns {void}
 */
function documentUpdateUploadState() {
    const uploadButton = document.getElementById('document_upload_button');
    const period = document.getElementById('document_period')?.value || '';
    const salesDate = document.getElementById('document_sales_date')?.value || '';
    if (!uploadButton) return;

    uploadButton.disabled = !(
        documentStorageReady &&
        documentSelectedFile &&
        documentIsValidPeriod(period) &&
        documentIsValidDate(salesDate)
    );
}

/**
 * Stores the selected file. There is exactly one record per board, market,
 * tool and month.
 * An existing record is replaced only after user confirmation.
 *
 * @returns {Promise<void>}
 */
async function documentSaveSelectedFile() {
    const periodInput = document.getElementById('document_period');
    const salesDateInput = document.getElementById('document_sales_date');
    const uploadButton = document.getElementById('document_upload_button');
    const boardId = documentGetBoardId();
    const period = periodInput?.value || '';
    const salesDate = salesDateInput?.value || '';

    if (!documentStorageReady) {
        documentSetStatus(
            documentBackendPending
                ? 'The frontend is ready; uploads become available after the document API is installed.'
                : 'The shared document library is currently unavailable.',
            'error'
        );
        return;
    }

    if (!boardId || !documentIsValidPeriod(period)) {
        documentSetStatus('Select a valid month before uploading.', 'error');
        periodInput?.focus();
        return;
    }

    if (!documentIsValidDate(salesDate)) {
        documentSetStatus('Select the sales data date contained in this edition.', 'error');
        salesDateInput?.focus();
        return;
    }

    if (!documentSelectedFile) {
        documentSetStatus(`Choose one ${documentGetTypeLabel()} HTML file first.`, 'error');
        return;
    }

    const documentType = documentSelectedType;
    const market = documentSelectedMarket;
    const existingRecord = documentGetRecords(market, documentType)
        .find(record => record.period === period);
    let replacing = Boolean(existingRecord);

    if (existingRecord) {
        const shouldReplace = window.confirm(
            `A ${documentGetTypeLabel()} edition for ${documentGetMarketLabel()} and ${documentFormatPeriod(period)} already exists. Replace it?`
        );
        if (!shouldReplace) {
            documentSetStatus('Replacement cancelled. The existing document was kept.', 'info');
            return;
        }
    }

    uploadButton?.setAttribute('aria-busy', 'true');
    if (uploadButton) uploadButton.disabled = true;
    documentSetStatus(
        replacing
            ? `Replacing the shared ${documentGetTypeLabel()} edition…`
            : `Uploading ${documentGetTypeLabel()} to the shared archive…`,
        'info'
    );

    try {
        const uploadDocument = async replaceExisting => {
            const formData = new FormData();
            formData.append('file', documentSelectedFile, documentSelectedFile.name);
            formData.append('market', market);
            formData.append('document_type', documentType);
            formData.append('period', period);
            formData.append('sales_date', salesDate);
            formData.append('replace', replaceExisting ? 'true' : 'false');

            return fetch(
                documentApiUrl(`boards/${encodeURIComponent(boardId)}/documents/`),
                {
                    method: 'POST',
                    headers: documentAuthHeaders(),
                    body: formData
                }
            );
        };

        let response = await uploadDocument(replacing);
        if (response.status === 409 && !replacing) {
            const replaceRemoteEdition = window.confirm(
                `Another board member has already added ${documentGetTypeLabel()} · ${market} · ${documentFormatPeriod(period)}. Replace that shared edition?`
            );
            if (!replaceRemoteEdition) {
                await documentLoadArchive();
                documentSetStatus('Replacement cancelled. The shared edition was kept.', 'info');
                return;
            }
            replacing = true;
            response = await uploadDocument(true);
        }

        if (!response.ok) {
            throw await documentCreateApiError(response);
        }

        documentClearPendingSelection();
        await documentLoadArchive();
        documentSetStatus(
            `${documentGetTypeLabel(documentType)} · ${market} · ${documentFormatPeriod(period)} was ${replacing ? 'replaced' : 'added'} in the shared archive.`,
            'success'
        );
    } catch (error) {
        console.error('[Documents] File could not be uploaded:', error);
        if (error?.status === 404 || error?.status === 405) {
            documentHandleLibraryUnavailable(error, 'The document API is not active yet.');
        } else {
            documentSetStatus(documentGetErrorMessage(error, 'The document could not be uploaded.'), 'error');
        }
    } finally {
        uploadButton?.removeAttribute('aria-busy');
        documentUpdateUploadState();
    }
}

/**
 * Deletes one shared server record.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
async function documentDeleteRecord(id) {
    const response = await fetch(
        documentApiUrl(`documents/${encodeURIComponent(id)}/`),
        { method: 'DELETE', headers: documentAuthHeaders() }
    );
    if (!response.ok) {
        throw await documentCreateApiError(response);
    }
}

/**
 * Handles archive Open/Delete actions using event delegation.
 *
 * @param {MouseEvent} event
 * @returns {Promise<void>}
 */
async function documentHandleArchiveAction(event) {
    const button = event.target.closest('[data-document-action][data-document-id]');
    if (!button) return;

    event.preventDefault();
    const id = button.dataset.documentId || '';
    const action = button.dataset.documentAction;

    if (action === 'open') {
        await documentOpenRecord(id);
        return;
    }

    if (action !== 'delete') return;

    const record = documentRecords.find(item => item.id === id);
    if (!record) {
        documentSetStatus('The selected document no longer exists.', 'error');
        return;
    }

    const shouldDelete = window.confirm(
        `Delete ${documentGetTypeLabel(record.type)} · ${record.market} · ${documentFormatPeriod(record.period)} from the shared archive for all board members?`
    );
    if (!shouldDelete) return;

    button.disabled = true;
    try {
        await documentDeleteRecord(id);
        await documentLoadArchive();
        documentSetStatus(
            `${documentGetTypeLabel(record.type)} · ${record.market} · ${documentFormatPeriod(record.period)} was deleted.`,
            'success'
        );
    } catch (error) {
        console.error('[Documents] Record could not be deleted:', error);
        button.disabled = false;
        if (error?.status === 404 || error?.status === 405) {
            documentHandleLibraryUnavailable(error, 'The document API is not active yet.');
        } else {
            documentSetStatus(documentGetErrorMessage(error, 'The document could not be deleted.'), 'error');
        }
    }
}

/**
 * Opens a server-stored HTML tool inside the page's sandboxed preview iframe.
 * The iframe deliberately allows scripts for interactive dashboards, but does
 * not receive `allow-same-origin`, so uploaded code cannot access app storage.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
async function documentOpenRecord(id) {
    const record = documentRecords.find(item => item.id === id);
    if (!record) {
        documentSetStatus('The selected document no longer exists.', 'error');
        return;
    }

    const dialog = document.getElementById('document_preview_dialog');
    const frame = document.getElementById('document_preview_iframe');
    const previewStatus = document.getElementById('document_preview_status');
    const previewTitle = document.getElementById('document_preview_title');
    const previewMeta = document.getElementById('document_preview_meta');

    if (!dialog || !frame) {
        documentSetStatus('The secure preview is not available in this page.', 'error');
        return;
    }

    const previewSequence = ++documentPreviewSequence;

    frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-downloads');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.removeAttribute('src');
    frame.srcdoc = '';

    if (previewTitle) {
        previewTitle.textContent = `${documentGetTypeLabel(record.type)} · ${record.market}`;
    }
    if (previewMeta) {
        const salesLabel = record.salesDate
            ? `Sales data ${documentFormatSalesDate(record.salesDate)}`
            : 'Sales data not provided';
        previewMeta.textContent = `${documentFormatPeriod(record.period)} · ${salesLabel} · ${record.fileName}`;
    }
    if (previewStatus) {
        previewStatus.hidden = false;
        previewStatus.dataset.state = 'info';
        previewStatus.textContent = 'Loading secure preview…';
    }

    documentShowPreview();
    documentSetStatus(
        `Loading ${documentGetTypeLabel(record.type)} · ${record.market} · ${documentFormatPeriod(record.period)}…`,
        'info'
    );

    try {
        const response = await fetch(record.contentUrl, {
            method: 'GET',
            headers: documentAuthHeaders()
        });
        if (!response.ok) throw await documentCreateApiError(response);

        const html = await response.text();
        if (previewSequence !== documentPreviewSequence) return;
        frame.srcdoc = documentPreparePreviewHtml(html);
        if (previewStatus) {
            previewStatus.dataset.state = 'ready';
            previewStatus.textContent = '';
            previewStatus.hidden = true;
        }
        documentSetStatus(
            `Opened ${documentGetTypeLabel(record.type)} · ${record.market} · ${documentFormatPeriod(record.period)}.`,
            'success'
        );
    } catch (error) {
        if (previewSequence !== documentPreviewSequence) return;
        console.error('[Documents] Secure preview failed:', error);
        const message = documentGetErrorMessage(error, 'The document could not be opened.');
        if (previewStatus) {
            previewStatus.hidden = false;
            previewStatus.dataset.state = 'error';
            previewStatus.textContent = message;
        }
        documentSetStatus(message, 'error');
    }
}

/**
 * Keeps the uploaded tool intact (including scripts) and makes links open in
 * a new tab. Execution remains isolated by the iframe sandbox without
 * `allow-same-origin`.
 *
 * @param {string} html
 * @returns {string}
 */
function documentPreparePreviewHtml(html) {
    const source = String(html || '');

    try {
        const parsed = new DOMParser().parseFromString(source, 'text/html');
        let base = parsed.head.querySelector('base');
        if (!base) {
            base = parsed.createElement('base');
            parsed.head.prepend(base);
        }
        base.target = '_blank';
        return `<!doctype html>\n${parsed.documentElement.outerHTML}`;
    } catch (_) {
        return source;
    }
}

/** Shows the in-page preview overlay. */
function documentShowPreview() {
    const dialog = document.getElementById('document_preview_dialog');
    if (!dialog) return;

    documentPreviewReturnFocus = document.activeElement;
    dialog.hidden = false;
    document.body.classList.add('document-preview-open');

    if (typeof dialog.showModal === 'function') {
        if (!dialog.open) dialog.showModal();
    } else {
        dialog.setAttribute('open', 'true');
    }

    document.getElementById('document_preview_close_button')?.focus();
}

/** Closes and clears the secure preview. */
function documentClosePreview() {
    const dialog = document.getElementById('document_preview_dialog');
    if (!dialog) return;

    if (typeof dialog.close === 'function' && dialog.open) {
        dialog.close();
    } else {
        documentClearPreview();
    }
}

/** Removes preview HTML and restores page scrolling. */
function documentClearPreview() {
    const dialog = document.getElementById('document_preview_dialog');
    const frame = document.getElementById('document_preview_iframe');
    documentPreviewSequence += 1;
    if (frame) frame.srcdoc = '';
    if (dialog) {
        dialog.hidden = true;
        dialog.removeAttribute('open');
    }
    document.body.classList.remove('document-preview-open');
    if (documentPreviewReturnFocus && typeof documentPreviewReturnFocus.focus === 'function') {
        documentPreviewReturnFocus.focus();
    }
    documentPreviewReturnFocus = null;
}

/**
 * Renders the archive, optionally filtered by #document_archive_filter.
 *
 * @returns {void}
 */
function documentRenderArchive() {
    const archiveList = document.getElementById('document_archive_list');
    const countOutput = document.getElementById('document_archive_count');
    const filterValue = document.getElementById('document_archive_filter')?.value || '';
    if (!archiveList) return;

    const selectedRecords = documentGetRecords();
    const visibleRecords = selectedRecords.filter(record => {
        return !documentIsValidPeriod(filterValue) || record.period === filterValue;
    });

    if (countOutput) {
        countOutput.textContent = `${visibleRecords.length} edition${visibleRecords.length === 1 ? '' : 's'}`;
        countOutput.setAttribute(
            'aria-label',
            `${visibleRecords.length} document${visibleRecords.length === 1 ? '' : 's'}`
        );
    }

    if (visibleRecords.length === 0) {
        const tool = documentGetTypeLabel();
        const mark = documentTypeCatalog[documentSelectedType]?.mark || 'HTML';
        const archiveUnavailable = !documentStorageReady && !documentBackendPending;
        const emptyTitle = documentBackendPending
            ? 'Backend pending'
            : archiveUnavailable
                ? 'Archive unavailable'
                : `No ${tool} editions found`;
        const emptyCopy = documentBackendPending
            ? 'The frontend is ready. Editions will appear here after the central document API is installed.'
            : archiveUnavailable
                ? 'The central document archive could not be reached. Try again when the backend is available.'
                : `Add the first ${tool} HTML edition for ${documentGetMarketLabel()}.`;
        archiveList.innerHTML = `
            <li class="document-empty-state">
                <span class="document-empty-icon" aria-hidden="true">${documentEscapeHtml(mark)}</span>
                <div>
                    <strong>${documentEscapeHtml(emptyTitle)}</strong>
                    <p>${documentBackendPending || archiveUnavailable
                        ? documentEscapeHtml(emptyCopy)
                        : documentIsValidPeriod(filterValue)
                            ? `No ${documentEscapeHtml(tool)} edition is stored for ${documentEscapeHtml(documentGetMarketLabel())} and ${documentEscapeHtml(documentFormatPeriod(filterValue))}.`
                            : documentEscapeHtml(emptyCopy)}</p>
                </div>
            </li>`;
        return;
    }

    archiveList.innerHTML = visibleRecords.map(record => {
        const safeId = documentEscapeHtml(record.id);
        const safePeriod = documentEscapeHtml(documentFormatPeriod(record.period));
        const safeFileName = documentEscapeHtml(
            record.fileName || documentTypeCatalog[record.type]?.fileName || 'document.html'
        );
        const safeSize = documentEscapeHtml(documentFormatBytes(record.size || 0));
        const safeUpdated = documentEscapeHtml(documentFormatDate(record.updatedAt || record.createdAt));
        const safeSalesDate = documentEscapeHtml(
            record.salesDate ? documentFormatSalesDate(record.salesDate) : 'Not provided'
        );
        const safeType = documentEscapeHtml(documentGetTypeLabel(record.type));
        const safeMarket = documentEscapeHtml(record.market);
        const safeMark = documentEscapeHtml(documentTypeCatalog[record.type]?.mark || 'HTML');

        return `
            <li class="document-archive-item document-entry">
                <div class="document-file-mark document-record-icon" aria-hidden="true">${safeMark}</div>
                <div class="document-archive-copy document-record-copy">
                    <span class="document-type-label">${safeMarket} · ${safeType}</span>
                    <h3 class="document-record-period">${safePeriod}</h3>
                    <p class="document-record-name" title="${safeFileName}">${safeFileName}</p>
                    <p class="document-record-sales">Sales data: ${safeSalesDate}</p>
                </div>
                <div class="document-file-meta document-record-meta">
                    <span>${safeSize}</span>
                    <span>Updated ${safeUpdated}</span>
                </div>
                <div class="document-archive-actions document-record-actions">
                    <button type="button"
                            class="std_btn btn_prime document-open-button document-record-action"
                            data-document-action="open"
                            data-document-id="${safeId}">
                        Open
                    </button>
                    <button type="button"
                            class="std_btn document-delete-button document-record-action document-record-action--delete"
                            data-document-action="delete"
                            data-document-id="${safeId}"
                            aria-label="Delete ${safeType} ${safeMarket} ${safePeriod}">
                        Delete
                    </button>
                </div>
            </li>`;
    }).join('');
}

/**
 * Sets a visible and screen-reader-accessible status message.
 *
 * @param {string} message
 * @param {'info'|'success'|'error'} [state='info']
 * @returns {void}
 */
function documentSetStatus(message, state = 'info') {
    const status = document.getElementById('document_status');
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
}

/**
 * Returns a safe UI message for network and API failures.
 *
 * @param {*} error
 * @param {string} fallback
 * @returns {string}
 */
function documentGetErrorMessage(error, fallback) {
    const message = typeof error?.message === 'string' ? error.message.trim() : '';
    return message || fallback;
}

/**
 * Keeps the frontend fully usable when the generic document API has not yet
 * been installed. No local-storage fallback is used.
 *
 * @param {*} error
 * @param {string} fallback
 * @returns {void}
 */
function documentHandleLibraryUnavailable(error, fallback) {
    const pending = error?.status === 404 || error?.status === 405;
    documentStorageReady = false;
    documentBackendPending = pending;
    documentLoadSequence += 1;

    if (pending) documentRecords = [];

    documentSetStorageBadge(pending ? 'pending' : 'error');
    documentRenderToolStatus();
    documentRenderArchive();
    documentUpdateUploadState();

    if (pending) {
        documentSetStatus(
            'Frontend ready · the central CH/AT document API will be connected in the backend step.',
            'info'
        );
        return;
    }

    console.error('[Documents] Shared library unavailable:', error);
    documentSetStatus(documentGetErrorMessage(error, fallback), 'error');
}

/** Updates the visible central-storage state badge. */
function documentSetStorageBadge(state) {
    const badge = document.querySelector('.document-storage-badge');
    if (!badge) return;

    const labels = {
        loading: 'Checking server archive',
        ready: 'Shared server archive',
        pending: 'Backend pending',
        error: 'Archive unavailable'
    };

    badge.textContent = labels[state] || labels.error;
    badge.dataset.state = state;
}

/**
 * Validates YYYY-MM and its month range.
 *
 * @param {string} value
 * @returns {boolean}
 */
function documentIsValidPeriod(value) {
    const match = /^(\d{4})-(\d{2})$/.exec(String(value || ''));
    if (!match) return false;
    const month = Number(match[2]);
    return month >= 1 && month <= 12;
}

/** Validates a real calendar date in YYYY-MM-DD format. */
function documentIsValidDate(value) {
    const normalized = String(value || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;
    const date = new Date(`${normalized}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === normalized;
}

/** Formats a sales-data date without local-timezone day shifts. */
function documentFormatSalesDate(value) {
    if (!documentIsValidDate(value)) return 'Not provided';
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat(document.documentElement.lang || 'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
    }).format(new Date(Date.UTC(year, month - 1, day)));
}

/**
 * Formats YYYY-MM for display.
 *
 * @param {string} period
 * @returns {string}
 */
function documentFormatPeriod(period) {
    if (!documentIsValidPeriod(period)) return String(period || 'Unknown period');
    const [year, month] = period.split('-').map(Number);
    const locale = document.documentElement.lang || 'en-GB';
    return new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
    }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/**
 * Formats a byte count into a compact file-size label.
 *
 * @param {number} bytes
 * @returns {string}
 */
function documentFormatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Formats an ISO timestamp for the current document locale.
 *
 * @param {string} isoDate
 * @returns {string}
 */
function documentFormatDate(isoDate) {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return 'unknown';
    return new Intl.DateTimeFormat(document.documentElement.lang || 'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date);
}

/**
 * Escapes untrusted text before it is inserted into HTML or attributes.
 *
 * @param {*} value
 * @returns {string}
 */
function documentEscapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
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
            OUR PORTFOLIO
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