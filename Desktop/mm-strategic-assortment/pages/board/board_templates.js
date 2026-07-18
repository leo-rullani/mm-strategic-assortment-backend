/**
 * @file board_templates.js
 * @summary HTML template helpers for board members, task cards, and comments.
 * @description
 * Provides small, framework-agnostic string template builders for:
 *  - Member profile circles (limited to 4 with "+X" overflow indicator)
 *  - Task detail person blocks (assignee/reviewer)
 *  - Single comment entries with optional delete button
 *  - Kanban task cards, including optional SFL Debriefing PDF export button
 *  - Move button group for changing task status
 * Includes a few helpers for SFL board detection, safe HTML preview extraction, and PDF export.
 *
 * @author
 *   Leugzim Rullani
 * @version 1.0.0
 */

/**
 * A board member.
 * @typedef {Object} Member
 * @property {string} id - Unique identifier for the member.
 * @property {string} fullname - Full name of the member.
 */

/**
 * A single task on the board.
 * @typedef {Object} Task
 * @property {number} id - Unique identifier of the task.
 * @property {string} title - Task title.
 * @property {string} description - Task description (may contain HTML).
 * @property {('high'|'medium'|'low')} priority - Priority indicator.
 * @property {'to-do'|'in-progress'|'review'|'done'} status - Current status.
 * @property {Member|null} [assignee] - Assigned member, if any.
 */

/**
 * A comment on a task.
 * @typedef {Object} Comment
 * @property {number} id - Unique identifier of the comment.
 * @property {string} author - Full name of the author.
 * @property {string} created_at - ISO date string of creation time.
 * @property {string} content - The comment body text.
 */

/**
 * A board (lightweight view).
 * @typedef {Object} Board
 * @property {string} [title] - Optional board title.
 * @property {Member[]} [members] - Optional list of board members.
 * @property {Task[]} [tasks] - Optional list of tasks.
 */

/**
 * Generates the HTML for the board member profile circles list.
 *
 * Shows up to 4 member initials. If there are more than 4 members,
 * displays a "+X" indicator for the remaining members.
 *
 * @param {Board} currentBoard - The board object containing members.
 * @returns {string} HTML string for rendering the member profile circles.
 *
 * @example
 * const html = getMemberListTemplate({ members: [{ fullname: 'Jane Doe' }] });
 * // -> "<li><div class=\"profile_circle color_J\">JD</div></li>"
 */
function getMemberListTemplate(currentBoard) {
    let listHTML = "";
    if (!currentBoard?.members) return listHTML;

    for (let i = 0; i < currentBoard.members.length; i++) {
        if (i >= 4) {
            listHTML += `<li><div class="profile_circle color_A">+${currentBoard.members.length - 4}</div></li>`;
            break;
        }
        const initials = getInitials(currentBoard.members[i].fullname);
        listHTML += `<li><div class="profile_circle color_${initials[0]}">${initials}</div></li>`;
    }
    return listHTML;
}

/**
 * Returns the HTML template for displaying a task member (assignee or reviewer).
 *
 * If a member is provided, shows their initials in a profile circle and their full name.
 * If no member is provided, shows a default user icon and the label "unassigned".
 *
 * @param {Member|null} member - The member object (or `null` if unassigned).
 * @returns {string} HTML string representing the member or an "unassigned" placeholder.
 *
 * @example
 * getDetailTaskPersonTemplate({ fullname: 'Jane Doe' });
 * // -> "<div class=\"profile_circle ...\">JD</div><p>Jane Doe</p>"
 */
function getDetailTaskPersonTemplate(member) {
    if (member) {
        const initials = getInitials(member.fullname);
        return `<div class="profile_circle color_${initials[0]}">${initials}</div>
                <p>${member.fullname}</p>`;
    } else {
        return `<img src="../../assets/icons/face_icon.svg" alt="">
                <p>unassigned</p>`;
    }
}

/**
 * Generates the HTML template for a single comment in the comment list.
 *
 * Displays the author's initials, name, time since creation, and comment content.
 * If the comment was authored by the current user, includes a delete button.
 *
 * @param {Comment} comment - The comment object.
 * @returns {string} HTML string representing a single comment entry.
 *
 * @example
 * getSingleCommmentTemplate({ id: 1, author: 'Jane Doe', created_at: new Date().toISOString(), content: 'Great!' });
 */
function getSingleCommmentTemplate(comment) {
    let delete_btn = comment.author == getAuthFullname()
        ? `<img src="../../assets/icons/delete.svg" class="delete_btn" alt="" onclick="deleteComment(${comment.id})">`
        : "";
    let userInitials = getInitials(comment.author);

    return `
        <article class="comment_wrapper d_flex_ss_gm w_full">
            <div class="profile_circle color_${userInitials[0]}">${userInitials}</div>
            <div class="d_flex_sc_gs f_d_c w_full">
                <header class="d_flex_sc_gm w_full d_sb">
                    <div class="d_flex_sc_gm">
                        <h4>${comment.author}</h4>
                        <p>${timeDifference(comment.created_at)}</p>
                    </div>
                    ${delete_btn}
                </header>
                <p class="w_full">${comment.content}</p>
            </div>
        </article>`;
}

/**
 * Generates the HTML for the dropdown list of potential assignees or reviewers
 * when creating or editing a task.
 *
 * The first entry allows the user to unset the member ("unassigned"), followed by all board members.
 * Clicking an entry will set (or unset) the corresponding member and close the dropdown.
 *
 * @param {'assignee'|'reviewer'} type - Which role the member is being assigned to.
 * @param {Board} currentBoard - The current board containing a members array.
 * @returns {string} HTML string for the member dropdown entries.
 *
 * @example
 * getTaskCreateMemberListEntrieTemplate('assignee', { members: [{ id: 'u1', fullname: 'Jane Doe' }] });
 */
function getTaskCreateMemberListEntrieTemplate(type, currentBoard) {
    let listHtml = `<li onclick="unsetMemberAs('${type}'); toggleDropdown(this, event)">
                        <img src="../../assets/icons/face_icon.svg" alt="">
                        <p>unassigned</p>
                    </li>`;
    if (!currentBoard?.members) return listHtml;

    currentBoard.members.forEach(member => {
        const initials = getInitials(member.fullname);
        listHtml += `<li onclick="setMemberAs('${member.id}', '${type}'); toggleDropdown(this, event)">
                        <div class="profile_circle color_${initials[0]}">${initials}</div>
                        <p>${member.fullname}</p>
                    </li>`;
    });

    return listHtml;
}

/**
 * Generates the HTML template for a task card on the Kanban board column.
 *
 * Shows the task's title, priority icon, assignee (profile circle or default icon),
 * a short preview of the description (HTML stripped), an optional PDF button
 * (only for SFL Debriefing boards), and the move button group.
 * Clicking the card opens the task detail dialog.
 *
 * @param {Task} task - The task to render.
 * @returns {string} HTML string representing the task card in the board column.
 *
 * @example
 * getBoardCardTemplate({ id: 1, title: 'Task', description: '<p>Text</p>', status: 'to-do', priority: 'high', assignee: null });
 */
function getBoardCardTemplate(task) {
    let assignee_html = task.assignee
        ? `<div class="profile_circle color_${getInitials(task.assignee.fullname)[0]}">${getInitials(task.assignee.fullname)}</div>`
        : `<img src="../../assets/icons/face_icon.svg" alt="">`;

    const pdfBtnHtml = isSflDebriefBoard()
        ? `<button type="button"
                   class="std_btn btn_prime d_flex_sc_gs"
                   onclick="exportTaskPdfFromCard(event, ${task.id})">
                <span>PDF</span>
           </button>`
        : '';

    return `
        <li class="column_card" onclick="openTaskDetailDialog(${task.id})">
            <header class="column_card_header">
                <h4 class="font_white_color">${task.title}</h4>
                <div class="d_flex_sc_gm">
                    ${pdfBtnHtml}
                    <img src="../../assets/icons/${task.priority}_prio_colored.svg" alt="">
                    ${assignee_html}
                </div>
            </header>
            <p class="column_card_content font_white_color">${safePreview(task.description, 160)}</p>
            ${getBoardCardMoveBtnTemplate(task)}
        </li>`;
}

/**
 * Generates the HTML template for the move button group of a board task card.
 *
 * Provides buttons to move a task to the previous or next status
 * (e.g., "to-do", "in-progress", "review", "done").
 * Only valid moves are rendered based on the current status.
 *
 * @param {Task} task - The task to move.
 * @returns {string} HTML string representing the move button dropdown for the task card.
 *
 * @example
 * getBoardCardMoveBtnTemplate({ id: 1, status: 'review', title: '', description: '', priority: 'low', assignee: null });
 */
function getBoardCardMoveBtnTemplate(task) {
    let statii = ['to-do', 'in-progress', 'review', 'done'];
    let currentStatusIndex = statii.indexOf(task.status);
    let moveBtns = "";
    if (currentStatusIndex > 0) {
        moveBtns += `<button onclick="modifyTaskStatus(${task.id}, '${statii[currentStatusIndex-1]}')">
                        ${statii[currentStatusIndex-1]}
                        <img class="rotate_half" src="../../assets/icons/arrow_forward.svg" alt="">
                     </button>`;
    }
    if (currentStatusIndex < statii.length - 1) {
        moveBtns += `<button onclick="modifyTaskStatus(${task.id}, '${statii[currentStatusIndex+1]}')">
                        ${statii[currentStatusIndex+1]}
                        <img src="../../assets/icons/arrow_forward.svg" alt="">
                     </button>`;
    }

    return `
        <div move-open="false" class="move_btn" onclick="toggleMoveOpen(this); stopProp(event)">
            <img src="../../assets/icons/swap_horiz.svg" alt="">
            <div class=" d_flex_sc_gs f_d_c pad_s">
                <p class="font_prime_color ">Move to</p>
                ${moveBtns}
            </div>
        </div>`;
}

/* ====================== Helpers ====================== */

/**
 * Returns `true` if the current board is an SFL Debriefing board.
 * Checks title for "debriefing" and either "Swiss Football League" or "SFL".
 *
 * @returns {boolean} Whether the current board matches the SFL Debriefing pattern.
 */
function isSflDebriefBoard() {
    const t = (window.currentBoard?.title || '').toLowerCase();
    return t.includes('debriefing') && (t.includes('swiss football league') || t.includes('sfl'));
}

/**
 * Extracts a short, clean text preview from HTML (removes <style>/<script> content).
 *
 * @param {string} html - Source HTML string.
 * @param {number} [maxLen=180] - Maximum preview length in characters.
 * @returns {string} A trimmed preview string with ellipsis if truncated.
 *
 * @example
 * safePreview('<p>Hello <b>World</b></p>', 10); // "Hello W…"
 */
function safePreview(html, maxLen) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    // Remove style/script nodes to avoid leaking CSS/JS into preview
    tmp.querySelectorAll('style,script').forEach(n => n.remove());

    let text = (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    const limit = Math.max(0, maxLen || 180);
    return text.length <= limit ? text : text.slice(0, limit - 1) + '…';
}

/**
 * Exports a task as PDF directly from the card (SFL Debriefing boards only).
 * Opens a new tab with the browser print dialog; the user can "Save as PDF".
 *
 * @param {MouseEvent} ev - The click event from the PDF button.
 * @param {number} taskId - The identifier of the task to export.
 * @returns {Promise<void>} Resolves when the export flow has been triggered.
 */
async function exportTaskPdfFromCard(ev, taskId) {
    ev.stopPropagation();
    ev.preventDefault();

    try {
        const task = (typeof getTaskById === 'function')
            ? getTaskById(taskId)
            : (window.currentBoard?.tasks || []).find(t => t.id == taskId);
        if (!task) return;

        const html = task.description || '';
        const baseTitle = task.title || 'debriefing';

        const mod = await import('./pdf_export.js'); // same directory as board_templates.js
        if (typeof mod.exportDebriefingTaskPdf === 'function') {
            // You can pass options as a third argument if your exporter supports it (e.g. { logoPos: 'bottom-right' })
            mod.exportDebriefingTaskPdf(html, baseTitle);
        } else if (typeof mod.downloadDebriefingPdf === 'function') {
            // Fallback: board-wide export (all tasks)
            mod.downloadDebriefingPdf();
        }
    } catch (e) {
        console.error('PDF export failed:', e);
    }
}