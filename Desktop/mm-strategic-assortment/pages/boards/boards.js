/**
 * Data entered in the create-board dialog before it is submitted.
 *
 * @type {{title: string, members: Array<Object>}}
 */
let currentCreateBoard = {
    title: "",
    members: [],
};

/**
 * All boards returned by the backend for the current user.
 *
 * @type {Array<Object>}
 */
let boardList = [];

/**
 * Escapes untrusted values before they are inserted into an HTML string.
 *
 * @param {*} value - Value to escape.
 * @returns {string} HTML-safe text.
 */
function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/**
 * Makes an API-provided value safe to embed as an inline function argument.
 * JSON.stringify correctly handles both numeric and string IDs.
 *
 * @param {string|number} value - ID to serialize.
 * @returns {string}
 */
function serializeInlineValue(value) {
    const serialized = JSON.stringify(value) ?? "null";

    return serialized
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "\\u003c")
        .replaceAll(">", "\\u003e");
}

/**
 * Returns a readable non-negative metric value.
 *
 * @param {*} value - Metric supplied by the API.
 * @returns {string|number}
 */
function normalizeBoardMetric(value) {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue < 0) {
        return 0;
    }

    return numberValue;
}

/**
 * Redirects the user to a board's detail page.
 *
 * @param {string|number} id - Unique board identifier.
 */
function redirectToBoard(id) {
    window.location.href = `../../pages/board/?id=${encodeURIComponent(id)}`;
}

/**
 * Opens a board when its card has keyboard focus.
 *
 * @param {KeyboardEvent} event - Keyboard event from the card.
 * @param {string|number} id - Unique board identifier.
 */
function handleBoardCardKeydown(event, id) {
    if (event.target !== event.currentTarget) {
        return;
    }

    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        redirectToBoard(id);
    }
}

/**
 * Fetches all boards and renders loading, success, empty, or error state.
 *
 * @returns {Promise<void>}
 */
async function getAndRenderBoardList() {
    renderBoardListLoading();

    const boards = await getBoards();

    if (!Array.isArray(boards)) {
        boardList = [];
        renderBoardCount(0, 0);
        renderBoardListError();
        return;
    }

    boardList = boards;
    renderBoardList();
}

/**
 * Fetches the current user's boards from the backend API.
 *
 * @returns {Promise<Array<Object>|null>}
 */
async function getBoards() {
    try {
        const boardResp = await getData(BOARDS_URL);

        if (boardResp.ok) {
            return Array.isArray(boardResp.data) ? boardResp.data : [];
        }

        return null;
    } catch (error) {
        console.error("Boards could not be loaded:", error);
        return null;
    }
}

/**
 * Renders the loading state inside the board list.
 */
function renderBoardListLoading() {
    const listRef = document.getElementById("board_list");

    if (!listRef) {
        return;
    }

    listRef.setAttribute("aria-busy", "true");
    listRef.innerHTML = `
        <li class="boards-loading-state boards-state boards-state--loading" aria-live="polite">
            <span class="boards-loading-spinner" aria-hidden="true"></span>
            <div>
                <strong>Loading boards</strong>
                <p>Your assortment workspaces are being prepared.</p>
            </div>
        </li>
    `;
}

/**
 * Renders an API error state with a retry action.
 */
function renderBoardListError() {
    const listRef = document.getElementById("board_list");

    if (!listRef) {
        return;
    }

    listRef.setAttribute("aria-busy", "false");
    listRef.innerHTML = `
        <li class="boards-state boards-state--error" role="alert">
            <span class="boards-state__symbol" aria-hidden="true">!</span>
            <div class="boards-state__copy">
                <strong>Boards could not be loaded</strong>
                <p>Check the backend connection and try again.</p>
            </div>
            <button
                class="std_btn btn_prime boards-state__action"
                type="button"
                onclick="getAndRenderBoardList()"
            >
                Try again
            </button>
        </li>
    `;
}

/**
 * Opens and resets the board creation dialog.
 */
function openBoardCreateDialog() {
    const dialogRef = document.getElementById("dialog_wrapper");
    const titleRef = document.getElementById("board_title_input");
    const emailRef = document.getElementById("create_board_email_input");

    currentCreateBoard = {
        title: "",
        members: [],
    };

    if (dialogRef) {
        dialogRef.setAttribute("current-dialog", "board_create");
        dialogRef.setAttribute("open", "true");
    }

    if (titleRef) {
        titleRef.value = "";
        setError(false, "board_title_input_group");
    }

    if (emailRef) {
        emailRef.value = "";
    }

    resetMailError();
    renderCreateDialogMemberList();

    window.requestAnimationFrame(() => titleRef?.focus());
}

/**
 * Validates only the create-dialog email field.
 * The settings dialog continues to use validateMemberEmail from
 * shared/js/board_settings.js and its own #email_error_label.
 *
 * @param {HTMLInputElement} element - Create-dialog email input.
 * @returns {boolean}
 */
function validateCreateBoardEmail(element) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const email = element.value.trim();
    const labelRef = document.getElementById("create_board_email_error_label");
    let valid = emailRegex.test(email);

    if (labelRef) {
        labelRef.innerText = "Please enter a valid email address.";
    }

    if (valid) {
        const isDuplicate = currentCreateBoard.members.some(
            (member) =>
                String(member.email ?? "").toLowerCase() === email.toLowerCase(),
        );

        if (isDuplicate) {
            valid = false;

            if (labelRef) {
                labelRef.innerText = "This email address is already a member.";
            }
        }
    }

    setError(!valid, "create_board_email_input_group");
    return valid;
}

/**
 * Validates and resolves a member entered in the create-board dialog.
 *
 * @returns {Promise<void>}
 */
async function boardCreateInviteMember() {
    const element = document.getElementById("create_board_email_input");

    if (!element || !validateCreateBoardEmail(element)) {
        return;
    }

    await boardCreateCheckMailAddress(element);
}

/**
 * Clears the create-dialog email error state.
 */
function resetMailError() {
    const groupRef = document.getElementById("create_board_email_input_group");
    const labelRef = document.getElementById("create_board_email_error_label");

    if (groupRef) {
        groupRef.setAttribute("error", "false");
    }

    if (labelRef) {
        labelRef.innerText = "Please enter a valid email address.";
    }
}

/**
 * Checks whether an email exists and adds the resolved user to the draft.
 *
 * @param {HTMLInputElement} element - Create-dialog email input.
 * @returns {Promise<void>}
 */
async function boardCreateCheckMailAddress(element) {
    const mail = element.value.trim();
    const labelRef = document.getElementById("create_board_email_error_label");
    const resp = await checkMailAddress(mail);

    if (resp) {
        currentCreateBoard.members.push(resp);
        element.value = "";
        resetMailError();
        renderCreateDialogMemberList();
        element.focus();
        return;
    }

    if (labelRef) {
        labelRef.innerText = "This email address does not exist.";
    }

    setError(true, "create_board_email_input_group");
}

/**
 * Validates and submits the board creation form.
 *
 * @param {SubmitEvent} event - Form submit event.
 * @returns {Promise<void>}
 */
async function boardCreateSubmit(event) {
    event.preventDefault();

    const element = document.getElementById("board_title_input");

    if (!element || !validateBoardTitle(element)) {
        return;
    }

    currentCreateBoard.title = element.value.trim();
    await createBoard();
}

/**
 * Persists the current board draft through the existing API helper.
 *
 * @returns {Promise<void>}
 */
async function createBoard() {
    const boardMemberIds = currentCreateBoard.members.map((member) => member.id);
    const response = await postData(BOARDS_URL, {
        title: currentCreateBoard.title,
        members: boardMemberIds,
    });

    if (!response.ok) {
        const errorArr = extractErrorMessages(response.data);
        showToastMessage(true, errorArr);
        return;
    }

    closeBoardDialog();
    await getAndRenderBoardList();
}

/**
 * Cancels board creation and closes the modal.
 */
function cancelCreateBoard() {
    currentCreateBoard = {
        title: "",
        members: [],
    };

    closeBoardDialog();
}

/**
 * Closes the board dialog without depending on its previous open state.
 */
function closeBoardDialog() {
    const dialogRef = document.getElementById("dialog_wrapper");

    if (dialogRef) {
        dialogRef.setAttribute("open", "false");
    }
}

/**
 * Renders members currently added to the board draft.
 */
function renderCreateDialogMemberList() {
    const listRef = document.getElementById("create_board_member_list");

    if (!listRef) {
        return;
    }

    if (currentCreateBoard.members.length === 0) {
        listRef.innerHTML = `
            <li class="boards-member-empty member-list-empty">
                No additional members added yet.
            </li>
        `;
        return;
    }

    listRef.innerHTML = currentCreateBoard.members
        .map((member) => {
            const memberId = serializeInlineValue(member.id);
            const memberEmail = escapeHtml(member.email);

            return `
                <li class="member-list-entry">
                    <span class="member-list-entry__avatar" aria-hidden="true">
                        ${escapeHtml(member.email?.charAt(0).toUpperCase() || "?")}
                    </span>
                    <span class="member-list-entry__email">${memberEmail}</span>
                    <button
                        class="std_btn member-list-entry__remove"
                        type="button"
                        onclick="removeCurrentMember(${memberId})"
                        aria-label="Remove ${memberEmail}"
                    >
                        Remove
                    </button>
                </li>
            `;
        })
        .join("");
}

/**
 * Removes a member by API ID from the current board draft.
 *
 * @param {string|number} id - Member ID.
 */
function removeCurrentMember(id) {
    currentCreateBoard.members = currentCreateBoard.members.filter(
        (member) => String(member.id) !== String(id),
    );

    renderCreateDialogMemberList();
}

/**
 * Filters and renders all board cards.
 */
function renderBoardList() {
    const listRef = document.getElementById("board_list");
    const searchRef = document.getElementById("board_search");

    if (!listRef) {
        return;
    }

    const searchValue = searchRef?.value.trim().toLowerCase() || "";
    const filteredBoards = boardList.filter((board) =>
        String(board.title ?? "").toLowerCase().includes(searchValue),
    );

    renderBoardCount(filteredBoards.length, boardList.length, searchValue);
    listRef.setAttribute("aria-busy", "false");

    if (filteredBoards.length === 0) {
        renderBoardListEmpty(searchValue);
        return;
    }

    listRef.innerHTML = filteredBoards
        .map((board) => getBoardlistEntrieTemplate(board))
        .join("");
}

/**
 * Updates the visible board result count if the page includes
 * #board_result_count.
 *
 * @param {number} visibleCount - Number of rendered boards.
 * @param {number} totalCount - Number of loaded boards.
 * @param {string} [searchValue=""] - Current search term.
 */
function renderBoardCount(visibleCount, totalCount, searchValue = "") {
    const countRef = document.getElementById("board_result_count");

    if (!countRef) {
        return;
    }

    if (searchValue && visibleCount !== totalCount) {
        countRef.innerText = `${visibleCount} of ${totalCount} boards`;
        return;
    }

    countRef.innerText = `${totalCount} ${totalCount === 1 ? "board" : "boards"}`;
}

/**
 * Renders the correct empty state for no boards or no search matches.
 *
 * @param {string} searchValue - Current normalized search value.
 */
function renderBoardListEmpty(searchValue) {
    const listRef = document.getElementById("board_list");

    if (!listRef) {
        return;
    }

    if (searchValue) {
        listRef.innerHTML = `
            <li class="boards-state boards-state--empty">
                <span class="boards-state__symbol" aria-hidden="true">⌕</span>
                <div class="boards-state__copy">
                    <strong>No matching boards</strong>
                    <p>Try another name or clear your search.</p>
                </div>
                <button
                    class="std_btn btn_third boards-state__action"
                    type="button"
                    onclick="clearBoardSearch()"
                >
                    Clear search
                </button>
            </li>
        `;
        return;
    }

    listRef.innerHTML = `
        <li class="boards-state boards-state--empty">
            <span class="boards-state__symbol" aria-hidden="true">＋</span>
            <div class="boards-state__copy">
                <strong>No boards yet</strong>
                <p>Create the first workspace for your assortment team.</p>
            </div>
            <button
                class="std_btn btn_prime boards-state__action"
                type="button"
                onclick="openBoardCreateDialog()"
            >
                Create board
            </button>
        </li>
    `;
}

/**
 * Clears the board search and re-renders all loaded boards.
 */
function clearBoardSearch() {
    const searchRef = document.getElementById("board_search");

    if (searchRef) {
        searchRef.value = "";
        searchRef.focus();
    }

    renderBoardList();
}

/**
 * Returns the redesigned card template for one board.
 *
 * @param {Object} board - Board API object.
 * @returns {string} Board card HTML.
 */
function getBoardlistEntrieTemplate(board) {
    const boardId = serializeInlineValue(board.id);
    const title = escapeHtml(board.title || "Untitled board");
    const members = normalizeBoardMetric(board.member_count);
    const tickets = normalizeBoardMetric(board.ticket_count);
    const tasksToDo = normalizeBoardMetric(board.tasks_to_do_count);
    const highPriority = normalizeBoardMetric(board.tasks_high_prio_count);

    return `
        <li
            class="board-card card"
            tabindex="0"
            role="link"
            aria-label="Open board ${title}"
            onclick="redirectToBoard(${boardId})"
            onkeydown="handleBoardCardKeydown(event, ${boardId})"
        >
            <div class="board-card__main">
                <div class="board-card__heading">
                    <span class="board-card__eyebrow">Assortment workspace</span>
                    <h3 class="board-card__title">${title}</h3>
                </div>

                <span class="board-card__open" aria-hidden="true">↗</span>
            </div>

            <div class="board-card__metrics" aria-label="Board metrics">
                <div class="board-metric">
                    <img
                        class="board-metric__icon"
                        src="../../assets/icons/member_icon.svg"
                        alt=""
                    >
                    <strong class="board-metric__value">${members}</strong>
                    <span class="board-metric__label">Members</span>
                </div>

                <div class="board-metric">
                    <img
                        class="board-metric__icon"
                        src="../../assets/icons/ticket_icon.svg"
                        alt=""
                    >
                    <strong class="board-metric__value">${tickets}</strong>
                    <span class="board-metric__label">Tickets</span>
                </div>

                <div class="board-metric">
                    <img
                        class="board-metric__icon"
                        src="../../assets/icons/assign_icon.svg"
                        alt=""
                    >
                    <strong class="board-metric__value">${tasksToDo}</strong>
                    <span class="board-metric__label">To-do</span>
                </div>

                <div class="board-metric board-metric--urgent">
                    <span class="priority-badge" priority="high" aria-hidden="true"></span>
                    <strong class="board-metric__value">${highPriority}</strong>
                    <span class="board-metric__label">High priority</span>
                </div>
            </div>

            <button
                class="std_btn board-card__settings board_settings_btn"
                type="button"
                onclick="openBoardSettingsDialog(${boardId}); stopProp(event)"
                aria-label="Open settings for ${title}"
            >
                <img src="../../assets/icons/settings.svg" alt="">
            </button>
        </li>
    `;
}

/**
 * Updates the currently selected board through the existing backend API.
 *
 * @param {Object} data - Partial board payload.
 * @returns {Promise<Object>} API response.
 */
async function updateBoard(data) {
    const response = await patchData(
        `${BOARDS_URL}${currentSettingsBoard.id}/`,
        data,
    );

    if (!response.ok) {
        const errorArr = extractErrorMessages(response.data);
        showToastMessage(true, errorArr);
    } else {
        await getAndRenderBoardList();
    }

    return response;
}

/**
 * Deletes the currently selected board and refreshes the board list.
 *
 * @returns {Promise<void>}
 */
async function deleteBoard() {
    await deleteData(`${BOARDS_URL}${currentSettingsBoard.id}/`);
    closeBoardDialog();
    await getAndRenderBoardList();
    deleteLastingToast();
}