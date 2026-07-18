/**
 * Object holding the current board being created.
 * @type {{title: string, members: Array}}
 */
let currentCreateBoard = {
    "title" : "",
    "members":[]
}

/**
 * Array storing all created boards.
 * @type {Array}
 */
let boardList = []

/**
 * Redirects the user to the board page with the given board ID.
 * @param {string|number} id - The unique identifier of the board.
 */
function redirectToBoard(id){
    window.location.href = "../../pages/board/?id="+id
}

/**
 * Asynchronously fetches all boards and renders the board list if available.
 * Updates the global boardList variable.
 * @returns {Promise<void>}
 */
async function getAndRenderBoardList(){
    boardList = await getBoards()
    if(boardList){
        renderBoardList()
    }
}

/**
 * Asynchronously fetches the list of boards from the backend API.
 * @returns {Promise<Array|null>} Returns an array of boards if successful, otherwise null.
 */
async function getBoards(){
    let boardResp = await getData(BOARDS_URL);

    if (boardResp.ok) {
        return boardResp.data;
    } else {
        return null
    }
}

/**
 * Opens the board creation dialog, resets the currentCreateBoard object,
 * and updates the UI elements for creating a new board.
 */
function openBoardCreateDialog(){
    toggleOpenId('dialog_wrapper')
    document.getElementById("dialog_wrapper").setAttribute("current-dialog", "board_create");
    currentCreateBoard = {
        "title" : "",
        "members":[]
    }
    renderCreateDialogMemberList()
    document.getElementById("board_title_input").value = "";
}

/**
 * Handles the process of inviting a member to the board during creation.
 * Validates the entered email and proceeds if the email is valid.
 * @returns {Promise<void>}
 */
async function boardCreateInviteMember(){
    let element = document.getElementById("create_board_email_input")
    let valid = validateMemberEmail(element, currentCreateBoard.members)
    if(valid){
        boardCreateCheckMailAddress(element)
    }
}

/**
 * Resets the mail error state in the email input group for board creation.
 */
function resetMailError(){
    setError(false, "create_board_email_input_group")
}

/**
 * Checks if the given email address exists and, if valid,
 * adds the corresponding member to the currentCreateBoard.members array.
 * Updates the member list UI or displays an error if the email is invalid.
 * @param {HTMLInputElement} element - The input element containing the email address.
 * @returns {Promise<void>}
 */
async function boardCreateCheckMailAddress(element){
    let mail = element.value.trim()
    let resp = await checkMailAddress(mail)
    if(resp){
        currentCreateBoard.members.push(resp)
        renderCreateDialogMemberList()
        document.getElementById("create_board_email_input").value = "";
    } else {
        document.getElementById("email_error_label").innerText = "This email adress doesn't exist."
        setError(true, element.id + "_group")
    }
}

/**
 * Handles the submission of the board creation form.
 * Validates the board title and, if valid, sets the title in currentCreateBoard
 * and calls the createBoard function.
 * @param {Event} event - The form submission event.
 * @returns {Promise<void>}
 */
async function boardCreateSubmit(event) {
    event.preventDefault();
    let element = document.getElementById("board_title_input")
    if(validateBoardTitle(element)){
        currentCreateBoard.title = element.value.trim()
        await createBoard()
    }
}

/**
 * Creates a new board by sending its data to the backend.
 * If creation fails, displays error messages; otherwise closes the dialog and refreshes the board list.
 * @returns {Promise<void>}
 */
async function createBoard(){
    let boardMemberIds = currentCreateBoard.members.map(member => member.id)
    let response = await postData(BOARDS_URL, {"title": currentCreateBoard.title, "members": boardMemberIds});
    if (!response.ok) {
        let errorArr = extractErrorMessages(response.data)
        showToastMessage(true, errorArr)
    } else {
        toggleOpenId('dialog_wrapper');
        await getAndRenderBoardList();
    }
}

/**
 * Cancels the board creation process, resets the currentCreateBoard object,
 * and closes the board creation dialog.
 */
function cancelCreateBoard(){
    currentCreateBoard = {
        "title" : "",
        "members":[]
    }
    toggleOpenId('dialog_wrapper')
}

/**
 * Renders the list of invited members in the board creation dialog.
 * Updates the UI element with the current members from currentCreateBoard.
 */
function renderCreateDialogMemberList(){
    let htmltext = "";
    currentCreateBoard.members.forEach(member => {
        htmltext +=  `<li>${member.email}<button onclick="removeCurrentMember(${member.id})" class="std_btn btn_prime">Remove</button></li>`
    });
    document.getElementById("create_board_member_list").innerHTML = htmltext;
}

/**
 * Removes a member from the currentCreateBoard.members array by index
 * and updates the member list in the dialog UI.
 * @param {number} id - The index of the member to remove.
 */
function removeCurrentMember(id){
    currentCreateBoard.members = currentCreateBoard.members.splice(id, 1);
    renderCreateDialogMemberList();
}

/**
 * Renders the list of boards filtered by the current search input.
 * Updates the board list UI with matching boards or a message if none are found.
 */
function renderBoardList(){
    let htmltext = "";
    let searchValue = document.getElementById("board_search").value.trim().toLowerCase();
    let renderBoardList = boardList.filter(board => board.title.toLowerCase().includes(searchValue));
    renderBoardList.forEach(board => {
        htmltext += getBoardlistEntrieTemplate(board);
    });
    if(renderBoardList.length <= 0){
        htmltext = `<h3 class="font_prime_color">...No boards available...</h3>`
    }
    document.getElementById("board_list").innerHTML = htmltext;
}

/**
 * Returns the HTML template for a single board entry in the board list.
 * @param {Object} board - The board object containing board details.
 * @returns {string} The HTML string representing the board entry.
 */
function getBoardlistEntrieTemplate(board){
    return `    <li class="card d_flex_sc_gl w_full" onclick="redirectToBoard(${board.id})">
                    <h3>${board.title}</h3>
                    <div class="board_list_entry_part d_flex_sc_gs">
                        <img src="../../assets/icons/member_icon.svg" alt="">
                        <p class="fs_m">${board.member_count}</p>
                        <p>Members</p>
                    </div>
                    <div class="board_list_entry_part d_flex_sc_gs">
                        <img src="../../assets/icons/ticket_icon.svg" alt="">
                        <p class="fs_m">${board.ticket_count}</p>
                        <p>Tickets</p>
                    </div>
                    <div class="board_list_entry_part d_flex_sc_gs">
                        <img src="../../assets/icons/assign_icon.svg" alt="">
                        <p class="fs_m">${board.tasks_to_do_count}</p>
                        <p>Tasks To-do</p>
                    </div>
                    <div class="board_list_entry_part d_flex_sc_gs">
                        <div class="priority-badge" priority="high"></div>
                        <p class="fs_m">${board.tasks_high_prio_count}</p>
                        <p>High Prio</p>
                    </div>
                    <button onclick="openBoardSettingsDialog(${board.id}); stopProp(event)" class="std_btn d_flex_sc_gs board_settings_btn">
                        <img src="../../assets/icons/settings.svg" alt="">
                    </button>
                </li>`
}

/**
 * Updates the current board with the provided data by sending a PATCH request to the backend.
 * Shows error messages if the update fails; otherwise refreshes the board list.
 * @param {Object} data - The data to update the board with.
 * @returns {Promise<Object>} The response from the backend.
 */
async function updateBoard(data){
    let response = await patchData(BOARDS_URL + currentSettingsBoard.id + "/", data);
    if (!response.ok) {
        let errorArr = extractErrorMessages(response.data)
        showToastMessage(true, errorArr)
    } else {
        await getAndRenderBoardList();
    }
    return response;
}

/**
 * Deletes the current board by sending a DELETE request to the backend.
 * Closes the dialog, refreshes the board list, and removes any lasting toast messages.
 * @returns {Promise<void>}
 */
async function deleteBoard(){
    await deleteData(BOARDS_URL + currentSettingsBoard.id + "/");
    toggleOpenId('dialog_wrapper');
    getAndRenderBoardList();
    deleteLastingToast()
}