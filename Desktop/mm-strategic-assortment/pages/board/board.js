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

    await bookletInitArchive();

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
/*  Strategic Assortment booklet archive (frontend-only / IndexedDB)          */
/* ========================================================================== */

const bookletDbName = 'mm-strategic-assortment-booklets';
const bookletDbVersion = 1;
const bookletStoreName = 'booklets';
const bookletMaxFileSize = 10 * 1024 * 1024;

let bookletDbPromise = null;
let bookletSelectedFile = null;
let bookletRecords = [];
let bookletStorageReady = false;

/**
 * Initializes the local booklet archive after the current board was loaded.
 * Safe to call more than once.
 *
 * Expected DOM IDs:
 *  - booklet_period (required, input[type="month"])
 *  - booklet_file_input (required, input[type="file"])
 *  - booklet_dropzone (required)
 *  - booklet_upload_button (required)
 *  - booklet_selected_file (optional)
 *  - booklet_status (optional)
 *  - booklet_archive_list (required)
 *  - booklet_archive_filter (optional, input[type="month"])
 *  - booklet_archive_count (optional)
 *  - booklet_choose_file_button (optional)
 *  - booklet_filter_clear_button (optional)
 *
 * @returns {Promise<void>}
 */
async function bookletInitArchive() {
    const periodInput = document.getElementById('booklet_period');
    const fileInput = document.getElementById('booklet_file_input');
    const dropzone = document.getElementById('booklet_dropzone');
    const uploadButton = document.getElementById('booklet_upload_button');
    const archiveList = document.getElementById('booklet_archive_list');

    if (!periodInput || !fileInput || !dropzone || !uploadButton || !archiveList) {
        console.warn('[Booklets] Archive markup is incomplete.');
        return;
    }

    bookletConfigureStatusRegion();
    bookletBindArchiveEvents();
    bookletUpdateUploadState();

    const boardId = bookletGetBoardId();
    if (!boardId) {
        bookletSetStatus('The board must be loaded before the booklet archive can start.', 'error');
        return;
    }

    if (!('indexedDB' in window)) {
        bookletSetStatus('This browser does not support local booklet storage.', 'error');
        return;
    }

    try {
        await bookletOpenDatabase();
        bookletStorageReady = true;
        await bookletLoadArchive();
        bookletSetStatus('Local booklet archive ready.', 'info');
    } catch (error) {
        bookletStorageReady = false;
        console.error('[Booklets] IndexedDB could not be initialized:', error);
        bookletSetStatus('The local booklet archive could not be opened.', 'error');
    }

    bookletUpdateUploadState();
}

/**
 * Adds all UI listeners exactly once.
 *
 * @returns {void}
 */
function bookletBindArchiveEvents() {
    const periodInput = document.getElementById('booklet_period');
    const fileInput = document.getElementById('booklet_file_input');
    const dropzone = document.getElementById('booklet_dropzone');
    const chooseButton = document.getElementById('booklet_choose_file_button');
    const uploadButton = document.getElementById('booklet_upload_button');
    const archiveList = document.getElementById('booklet_archive_list');
    const filterInput = document.getElementById('booklet_archive_filter');
    const clearFilterButton = document.getElementById('booklet_filter_clear_button');
    const resetButton = document.getElementById('booklet_reset_btn');

    if (periodInput && !periodInput.dataset.bookletBound) {
        periodInput.addEventListener('change', () => {
            bookletSelectedFile = null;
            if (fileInput) fileInput.value = '';
            bookletRenderSelectedFile();
            bookletUpdateUploadState();
            bookletSetStatus(
                bookletIsValidPeriod(periodInput.value)
                    ? `Period selected: ${bookletFormatPeriod(periodInput.value)}.`
                    : 'Select a month before choosing a booklet.',
                'info'
            );
        });
        periodInput.dataset.bookletBound = 'true';
    }

    if (fileInput && !fileInput.dataset.bookletBound) {
        fileInput.setAttribute('accept', '.html,.htm,text/html');
        fileInput.addEventListener('change', () => bookletHandleFiles(fileInput.files));
        fileInput.dataset.bookletBound = 'true';
    }

    if (dropzone && !dropzone.dataset.bookletBound) {
        dropzone.addEventListener('click', event => {
            if (event.target.closest('button, a, input, label')) return;
            bookletOpenFilePicker();
        });

        dropzone.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                bookletOpenFilePicker();
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
            bookletHandleFiles(event.dataTransfer?.files || []);
        });

        dropzone.dataset.bookletBound = 'true';
    }

    if (chooseButton && !chooseButton.dataset.bookletBound) {
        chooseButton.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            bookletOpenFilePicker();
        });
        chooseButton.dataset.bookletBound = 'true';
    }

    if (uploadButton && !uploadButton.dataset.bookletBound) {
        uploadButton.addEventListener('click', bookletSaveSelectedFile);
        uploadButton.dataset.bookletBound = 'true';
    }

    if (filterInput && !filterInput.dataset.bookletBound) {
        filterInput.addEventListener('change', bookletRenderArchive);
        filterInput.dataset.bookletBound = 'true';
    }

    if (clearFilterButton && !clearFilterButton.dataset.bookletBound) {
        clearFilterButton.addEventListener('click', event => {
            event.preventDefault();
            if (filterInput) filterInput.value = '';
            bookletRenderArchive();
        });
        clearFilterButton.dataset.bookletBound = 'true';
    }

    if (resetButton && !resetButton.dataset.bookletBound) {
        resetButton.addEventListener('click', bookletResetSelection);
        resetButton.dataset.bookletBound = 'true';
    }

    if (archiveList && !archiveList.dataset.bookletBound) {
        archiveList.addEventListener('click', bookletHandleArchiveAction);
        archiveList.dataset.bookletBound = 'true';
    }
}

/**
 * Expands or collapses the Strategic Assortment booklet workspace.
 */
function toggleBookletHub(forceOpen) {
    const hub = document.getElementById('booklet_hub');
    const button = document.getElementById('booklet-toggle-btn');
    if (!hub) return;

    const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : hub.hidden;
    hub.hidden = !shouldOpen;
    button?.setAttribute('aria-expanded', String(shouldOpen));
    button?.classList.toggle('is-active', shouldOpen);

    if (shouldOpen) {
        window.requestAnimationFrame(() => {
            hub.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
}

/**
 * Clears the pending month/file selection without deleting archived editions.
 */
function bookletResetSelection() {
    const periodInput = document.getElementById('booklet_period');
    const fileInput = document.getElementById('booklet_file_input');
    bookletSelectedFile = null;
    if (periodInput) periodInput.value = '';
    if (fileInput) fileInput.value = '';
    bookletRenderSelectedFile();
    bookletUpdateUploadState();
    bookletSetStatus('Selection reset. Choose an edition month to continue.', 'info');
}

/**
 * Ensures the status element works for screen readers even if the attributes
 * were omitted from the HTML.
 *
 * @returns {void}
 */
function bookletConfigureStatusRegion() {
    const status = document.getElementById('booklet_status');
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
function bookletGetBoardId() {
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
 * Opens (and if necessary creates) the local IndexedDB database.
 *
 * @returns {Promise<IDBDatabase>}
 */
function bookletOpenDatabase() {
    if (bookletDbPromise) return bookletDbPromise;

    bookletDbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(bookletDbName, bookletDbVersion);

        request.onupgradeneeded = () => {
            const database = request.result;
            let store;

            if (!database.objectStoreNames.contains(bookletStoreName)) {
                store = database.createObjectStore(bookletStoreName, { keyPath: 'id' });
            } else {
                store = request.transaction.objectStore(bookletStoreName);
            }

            if (!store.indexNames.contains('boardId')) {
                store.createIndex('boardId', 'boardId', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('IndexedDB could not be opened.'));
        request.onblocked = () => reject(new Error('IndexedDB upgrade is blocked by another tab.'));
    }).catch(error => {
        bookletDbPromise = null;
        throw error;
    });

    return bookletDbPromise;
}

/**
 * Resolves when an IndexedDB transaction is fully committed.
 *
 * @param {IDBTransaction} transaction
 * @returns {Promise<void>}
 */
function bookletTransactionDone(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error('Booklet transaction failed.'));
        transaction.onabort = () => reject(transaction.error || new Error('Booklet transaction was aborted.'));
    });
}

/**
 * Converts an IndexedDB request into a Promise.
 *
 * @param {IDBRequest} request
 * @returns {Promise<*>}
 */
function bookletRequestResult(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Booklet request failed.'));
    });
}

/**
 * Loads the archive records for the currently opened board.
 *
 * @returns {Promise<void>}
 */
async function bookletLoadArchive() {
    const boardId = bookletGetBoardId();
    if (!boardId) return;

    const database = await bookletOpenDatabase();
    const transaction = database.transaction(bookletStoreName, 'readonly');
    const store = transaction.objectStore(bookletStoreName);
    const request = store.index('boardId').getAll(boardId);

    bookletRecords = await bookletRequestResult(request);
    bookletSortRecords();
    bookletRenderArchive();
}

/**
 * Sorts newest periods first, with newest replacement first as a tie-breaker.
 *
 * @returns {void}
 */
function bookletSortRecords() {
    bookletRecords.sort((first, second) => {
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
function bookletOpenFilePicker() {
    const periodInput = document.getElementById('booklet_period');
    const fileInput = document.getElementById('booklet_file_input');

    if (!periodInput || !bookletIsValidPeriod(periodInput.value)) {
        bookletSetStatus('Select the Strategic Assortment month first.', 'error');
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
function bookletHandleFiles(files) {
    const periodInput = document.getElementById('booklet_period');
    const fileInput = document.getElementById('booklet_file_input');
    const fileArray = Array.from(files || []);

    if (!periodInput || !bookletIsValidPeriod(periodInput.value)) {
        bookletSelectedFile = null;
        if (fileInput) fileInput.value = '';
        bookletRenderSelectedFile();
        bookletUpdateUploadState();
        bookletSetStatus('Select the Strategic Assortment month before adding a file.', 'error');
        periodInput?.focus();
        return;
    }

    if (fileArray.length !== 1) {
        bookletSelectedFile = null;
        if (fileInput) fileInput.value = '';
        bookletRenderSelectedFile();
        bookletUpdateUploadState();
        bookletSetStatus('Choose exactly one HTML file.', 'error');
        return;
    }

    const file = fileArray[0];
    const lowerName = String(file.name || '').toLowerCase();
    const hasAllowedExtension = lowerName.endsWith('.html') || lowerName.endsWith('.htm');

    if (!hasAllowedExtension) {
        bookletSelectedFile = null;
        if (fileInput) fileInput.value = '';
        bookletRenderSelectedFile();
        bookletUpdateUploadState();
        bookletSetStatus('Only .html or .htm booklets are accepted.', 'error');
        return;
    }

    if (file.size <= 0) {
        bookletSelectedFile = null;
        if (fileInput) fileInput.value = '';
        bookletRenderSelectedFile();
        bookletUpdateUploadState();
        bookletSetStatus('The selected HTML file is empty.', 'error');
        return;
    }

    if (file.size > bookletMaxFileSize) {
        bookletSelectedFile = null;
        if (fileInput) fileInput.value = '';
        bookletRenderSelectedFile();
        bookletUpdateUploadState();
        bookletSetStatus('The booklet must not be larger than 10 MB.', 'error');
        return;
    }

    bookletSelectedFile = file;
    bookletRenderSelectedFile();
    bookletUpdateUploadState();
    bookletSetStatus(
        `${file.name} is ready for ${bookletFormatPeriod(periodInput.value)}.`,
        'success'
    );
}

/**
 * Updates the pending-file summary.
 *
 * @returns {void}
 */
function bookletRenderSelectedFile() {
    const output = document.getElementById('booklet_selected_file');
    const dropzone = document.getElementById('booklet_dropzone');
    if (!output) return;

    if (!bookletSelectedFile) {
        output.textContent = 'No HTML file selected';
        output.removeAttribute('title');
        output.classList.remove('has-file');
        dropzone?.classList.remove('has-file');
        return;
    }

    output.textContent = `${bookletSelectedFile.name} · ${bookletFormatBytes(bookletSelectedFile.size)}`;
    output.title = bookletSelectedFile.name;
    output.classList.add('has-file');
    dropzone?.classList.add('has-file');
}

/**
 * Enables upload only when storage, period and file are ready.
 *
 * @returns {void}
 */
function bookletUpdateUploadState() {
    const uploadButton = document.getElementById('booklet_upload_button');
    const period = document.getElementById('booklet_period')?.value || '';
    if (!uploadButton) return;

    uploadButton.disabled = !(
        bookletStorageReady &&
        bookletSelectedFile &&
        bookletIsValidPeriod(period)
    );
}

/**
 * Stores the selected file. There is exactly one record per board and month.
 * An existing record is replaced only after user confirmation.
 *
 * @returns {Promise<void>}
 */
async function bookletSaveSelectedFile() {
    const periodInput = document.getElementById('booklet_period');
    const fileInput = document.getElementById('booklet_file_input');
    const uploadButton = document.getElementById('booklet_upload_button');
    const boardId = bookletGetBoardId();
    const period = periodInput?.value || '';

    if (!bookletStorageReady) {
        bookletSetStatus('The local booklet archive is not available.', 'error');
        return;
    }

    if (!boardId || !bookletIsValidPeriod(period)) {
        bookletSetStatus('Select a valid month before uploading.', 'error');
        periodInput?.focus();
        return;
    }

    if (!bookletSelectedFile) {
        bookletSetStatus('Choose one HTML booklet first.', 'error');
        return;
    }

    const recordId = bookletCreateRecordId(boardId, period);
    const existingRecord = bookletRecords.find(record => record.id === recordId);

    if (existingRecord) {
        const shouldReplace = window.confirm(
            `A Strategic Assortment booklet for ${bookletFormatPeriod(period)} already exists. Replace it?`
        );
        if (!shouldReplace) {
            bookletSetStatus('Replacement cancelled. The existing booklet was kept.', 'info');
            return;
        }
    }

    uploadButton?.setAttribute('aria-busy', 'true');
    if (uploadButton) uploadButton.disabled = true;
    bookletSetStatus('Saving booklet locally…', 'info');

    try {
        const html = await bookletSelectedFile.text();
        const now = new Date().toISOString();
        const record = {
            id: recordId,
            boardId,
            category: 'Strategic Assortment',
            period,
            fileName: bookletSelectedFile.name,
            mimeType: bookletSelectedFile.type || 'text/html',
            size: bookletSelectedFile.size,
            createdAt: existingRecord?.createdAt || now,
            updatedAt: now,
            html
        };

        await bookletWriteRecord(record);
        bookletSelectedFile = null;
        if (fileInput) fileInput.value = '';
        bookletRenderSelectedFile();
        await bookletLoadArchive();
        bookletSetStatus(
            `Strategic Assortment ${bookletFormatPeriod(period)} was saved locally.`,
            'success'
        );
    } catch (error) {
        console.error('[Booklets] File could not be stored:', error);
        bookletSetStatus('The booklet could not be saved locally.', 'error');
    } finally {
        uploadButton?.removeAttribute('aria-busy');
        bookletUpdateUploadState();
    }
}

/**
 * Writes or replaces a single IndexedDB record.
 *
 * @param {Object} record
 * @returns {Promise<void>}
 */
async function bookletWriteRecord(record) {
    const database = await bookletOpenDatabase();
    const transaction = database.transaction(bookletStoreName, 'readwrite');
    const completion = bookletTransactionDone(transaction);
    transaction.objectStore(bookletStoreName).put(record);
    await completion;
}

/**
 * Deletes a single IndexedDB record.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
async function bookletDeleteRecord(id) {
    const database = await bookletOpenDatabase();
    const transaction = database.transaction(bookletStoreName, 'readwrite');
    const completion = bookletTransactionDone(transaction);
    transaction.objectStore(bookletStoreName).delete(id);
    await completion;
}

/**
 * Handles archive Open/Delete actions using event delegation.
 *
 * @param {MouseEvent} event
 * @returns {Promise<void>}
 */
async function bookletHandleArchiveAction(event) {
    const button = event.target.closest('[data-booklet-action][data-booklet-id]');
    if (!button) return;

    event.preventDefault();
    const id = button.dataset.bookletId || '';
    const action = button.dataset.bookletAction;

    if (action === 'open') {
        bookletOpenRecord(id);
        return;
    }

    if (action !== 'delete') return;

    const record = bookletRecords.find(item => item.id === id);
    if (!record) {
        bookletSetStatus('The selected booklet no longer exists.', 'error');
        return;
    }

    const shouldDelete = window.confirm(
        `Delete Strategic Assortment ${bookletFormatPeriod(record.period)} from this browser?`
    );
    if (!shouldDelete) return;

    button.disabled = true;
    try {
        await bookletDeleteRecord(id);
        await bookletLoadArchive();
        bookletSetStatus(
            `Strategic Assortment ${bookletFormatPeriod(record.period)} was deleted.`,
            'success'
        );
    } catch (error) {
        console.error('[Booklets] Record could not be deleted:', error);
        button.disabled = false;
        bookletSetStatus('The booklet could not be deleted.', 'error');
    }
}

/**
 * Opens a stored HTML booklet in a separate, opener-isolated tab.
 *
 * @param {string} id
 * @returns {void}
 */
function bookletOpenRecord(id) {
    const record = bookletRecords.find(item => item.id === id);
    if (!record) {
        bookletSetStatus('The selected booklet no longer exists.', 'error');
        return;
    }

    const blob = new Blob([record.html || ''], { type: 'text/html;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = objectUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    bookletSetStatus(
        `Opened Strategic Assortment ${bookletFormatPeriod(record.period)} in a new tab.`,
        'success'
    );
}

/**
 * Renders the archive, optionally filtered by #booklet_archive_filter.
 *
 * @returns {void}
 */
function bookletRenderArchive() {
    const archiveList = document.getElementById('booklet_archive_list');
    const countOutput = document.getElementById('booklet_archive_count');
    const filterValue = document.getElementById('booklet_archive_filter')?.value || '';
    if (!archiveList) return;

    const visibleRecords = bookletRecords.filter(record => {
        return !bookletIsValidPeriod(filterValue) || record.period === filterValue;
    });

    if (countOutput) {
        countOutput.textContent = `${visibleRecords.length} edition${visibleRecords.length === 1 ? '' : 's'}`;
        countOutput.setAttribute(
            'aria-label',
            `${visibleRecords.length} booklet${visibleRecords.length === 1 ? '' : 's'}`
        );
    }

    if (visibleRecords.length === 0) {
        archiveList.innerHTML = `
            <li class="booklet-empty-state">
                <span class="booklet-empty-icon" aria-hidden="true">SA</span>
                <div>
                    <strong>No booklets found</strong>
                    <p>${bookletIsValidPeriod(filterValue)
                        ? `No Strategic Assortment booklet is stored for ${bookletEscapeHtml(bookletFormatPeriod(filterValue))}.`
                        : 'Select a month and add the first Strategic Assortment HTML booklet.'}</p>
                </div>
            </li>`;
        return;
    }

    archiveList.innerHTML = visibleRecords.map(record => {
        const safeId = bookletEscapeHtml(record.id);
        const safePeriod = bookletEscapeHtml(bookletFormatPeriod(record.period));
        const safeFileName = bookletEscapeHtml(record.fileName || 'strategic-assortment.html');
        const safeSize = bookletEscapeHtml(bookletFormatBytes(record.size || 0));
        const safeUpdated = bookletEscapeHtml(bookletFormatDate(record.updatedAt || record.createdAt));

        return `
            <li class="booklet-archive-item booklet-entry">
                <div class="booklet-file-mark booklet-record-icon" aria-hidden="true">HTML</div>
                <div class="booklet-archive-copy booklet-record-copy">
                    <span class="booklet-type-label">Strategic Assortment</span>
                    <h3 class="booklet-record-period">${safePeriod}</h3>
                    <p class="booklet-record-name" title="${safeFileName}">${safeFileName}</p>
                </div>
                <div class="booklet-file-meta booklet-record-meta">
                    <span>${safeSize}</span>
                    <span>Updated ${safeUpdated}</span>
                </div>
                <div class="booklet-archive-actions booklet-record-actions">
                    <button type="button"
                            class="std_btn btn_prime booklet-open-button booklet-record-action"
                            data-booklet-action="open"
                            data-booklet-id="${safeId}">
                        Open
                    </button>
                    <button type="button"
                            class="std_btn booklet-delete-button booklet-record-action booklet-record-action--delete"
                            data-booklet-action="delete"
                            data-booklet-id="${safeId}"
                            aria-label="Delete Strategic Assortment ${safePeriod}">
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
function bookletSetStatus(message, state = 'info') {
    const status = document.getElementById('booklet_status');
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
}

/**
 * Creates the deterministic one-record-per-board-and-period key.
 *
 * @param {string} boardId
 * @param {string} period
 * @returns {string}
 */
function bookletCreateRecordId(boardId, period) {
    return `${boardId}::${period}`;
}

/**
 * Validates YYYY-MM and its month range.
 *
 * @param {string} value
 * @returns {boolean}
 */
function bookletIsValidPeriod(value) {
    const match = /^(\d{4})-(\d{2})$/.exec(String(value || ''));
    if (!match) return false;
    const month = Number(match[2]);
    return month >= 1 && month <= 12;
}

/**
 * Formats YYYY-MM for display.
 *
 * @param {string} period
 * @returns {string}
 */
function bookletFormatPeriod(period) {
    if (!bookletIsValidPeriod(period)) return String(period || 'Unknown period');
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
function bookletFormatBytes(bytes) {
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
function bookletFormatDate(isoDate) {
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
function bookletEscapeHtml(value) {
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