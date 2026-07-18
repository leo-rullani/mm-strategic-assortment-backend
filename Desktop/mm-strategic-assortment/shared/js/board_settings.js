/**
 * Stores the currently selected board for settings.
 * @type {Object|undefined}
 */
let currentSettingsBoard;

/**
 * Validates the board title input field to ensure length is between 3 and 63 characters.
 * Sets or clears error state accordingly.
 * @param {HTMLInputElement} element - The board title input element.
 * @returns {boolean} True if valid, false otherwise.
 */
function validateBoardTitle(element){
    let valid = element.value.trim().length > 2 && element.value.trim().length < 64;
    setError(!valid, element.id + "_group")
    return valid
}

/**
 * Validates an email input against a regex and checks for duplicates in the member list.
 * Updates error message label and sets error state accordingly.
 * @param {HTMLInputElement} element - The email input element to validate.
 * @param {Array<Object>} memberlist - The list of current members to check for duplicates.
 * @returns {boolean} True if the email is valid and not a duplicate, false otherwise.
 */
function validateMemberEmail(element, memberlist) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    let valid = emailRegex.test(element.value.trim())
    let labelRef = document.getElementById("email_error_label")
    labelRef.innerText = "Please enter a valid email address."

    if(valid){
        valid = memberlist.filter( user => user.email == element.value.trim()).length == 0
        labelRef.innerText = "This email adress already exist as member."
    }
    
    setError(!valid, element.id + "_group")
    return valid 
}

/**
 * Opens the board settings dialog for the board with the given ID.
 * Fetches the board data, sets the currentSettingsBoard, and renders the settings dialog.
 * Logs an error if the board is not found.
 * @param {string|number} id - The unique identifier of the board.
 * @returns {Promise<void>}
 */
async function openBoardSettingsDialog(id) {
    let board = await getBoardById(id);
    if (board) {
        currentSettingsBoard = board;
        document.getElementById("dialog_wrapper").setAttribute("current-dialog", "board_settings");
        toggleOpenId('dialog_wrapper');
        renderBoardSettingsDialog();
    } else {
        console.error("Board not found");
    }
}

/**
 * Fetches a board by its ID from the backend.
 * @param {string|number} id - The unique identifier of the board.
 * @returns {Promise<Object|null>} The board data if found, otherwise null.
 */
async function getBoardById(id) {
    let response = await getData(BOARDS_URL + id + "/");
    if (response.ok) {
        return response.data;
    } else {
        return null;
    }
}

/**
 * Renders the board settings dialog UI, including the board title and member list.
 */
function renderBoardSettingsDialog(){
    document.getElementById("board_settings_title").innerText = currentSettingsBoard.title;
    renderBoardSettingsMemberList()
}

/**
 * Renders the member list in the board settings dialog.
 * Marks the board owner and provides remove buttons for other members.
 */
function renderBoardSettingsMemberList(){
    let htmltext = "";
    currentSettingsBoard.members.forEach(member => {
        if(member.id == currentSettingsBoard.owner_id){
            htmltext += `<li>${member.email} <p>(owner)</p></li>`
        } else {
            htmltext +=  `<li>${member.email}<button onclick="removeBoardSettingsMember(${member.id})" class="std_btn btn_prime ">Remove</button></li>`
        }
    });
    document.getElementById("board_settings_member_list").innerHTML = htmltext;
}

/**
 * Removes a member from the currentSettingsBoard's members by ID,
 * updates the backend with the new member list, and re-renders the member list.
 * @param {string|number} id - The ID of the member to remove.
 * @returns {Promise<void>}
 */
async function removeBoardSettingsMember(id){
    currentSettingsBoard.members = currentSettingsBoard.members.filter(member => member.id !== id);
    await patchBoardSettingsMembers()
    renderBoardSettingsMemberList();
}

/**
 * Initiates the process to invite a new member to the board settings.
 * Validates the entered email and proceeds to check the email address if valid.
 */
function boardSettingsInviteMember(){
    let element = document.getElementById("board_settings_email_input")
    let valid = validateMemberEmail(element, currentSettingsBoard.members)
    if(valid){
        boardSettingsCheckMailAddress(element)
    }
}

/**
 * Checks if the given email address exists and, if valid,
 * adds the corresponding member to the currentSettingsBoard members list,
 * updates the UI, and patches the backend.
 * Shows an error message if the email is invalid.
 * @param {HTMLInputElement} element - The email input element.
 * @returns {Promise<void>}
 */
async function boardSettingsCheckMailAddress(element){
    let mail = element.value.trim()
    let resp = await checkMailAddress(mail)
    if(resp){
        currentSettingsBoard.members.push(resp)
        renderBoardSettingsMemberList()
        document.getElementById("board_settings_email_input").value = "";
        await patchBoardSettingsMembers()
    } else {
        document.getElementById("email_error_label").innerText = "This email adress doesn't exist."
        setError(true, element.id + "_group")
    }
}

/**
 * Updates the current board's members on the backend by sending their IDs.
 */
function patchBoardSettingsMembers(){
    let boardMemberIds = currentSettingsBoard.members.map(member => member.id)
    updateBoard({"members": boardMemberIds})
}

/**
 * Toggles the edit mode for the board title in the settings dialog.
 * When entering edit mode, sets the input value to the current title and focuses it.
 */
function toggleBoardTitleEdit(){
    let titleElement = document.getElementById("board_settings_title_group");
    let isEditing = titleElement.getAttribute("edit") === "true";
    titleElement.setAttribute("edit", !isEditing);
    if(!isEditing) {
        let inputElement = document.getElementById("board_settings_title_input");
        inputElement.value = currentSettingsBoard.title;
        inputElement.focus();
    }
}

/**
 * Sets a new board title after validating the input.
 * Updates the backend and UI if successful, and toggles edit mode off.
 * @returns {Promise<boolean>} True if the title was updated successfully, false otherwise.
 */
async function setNewBoardTitle(){
    let inputElement = document.getElementById("board_settings_title_input");
    let title = inputElement.value.trim();
    if (validateBoardTitle(inputElement)) {
        
        let resp = await updateBoard({"title": title});
        if(resp.ok){
            currentSettingsBoard.title = title;
            let titleElement = document.getElementById("board_settings_title");
            titleElement.innerText = title;
            toggleBoardTitleEdit();
        }
        return true
    }
    return false
}

/**
 * Opens a confirmation toast message for deleting the current board,
 * displaying the board title and providing delete and cancel options.
 */
function openBoardDeleteToast(){
    let htmltext = `
            <article class="font_ d_flex_cc_gl">
                <div class=" d_flex_ss_gm f_d_c">
                    <h3>Delete Board</h3>
                    <p>Are you sure you want to delete the board ${currentSettingsBoard.title}?</p>
                </div>
                <div class="font_sec_color d_flex_cc_gm f_d_c">
                    <button onclick="deleteBoard()" class="std_btn btn_prime d_flex_sc_gs">
                        <img src="../../assets/icons/delete_dark.svg" alt="">
                        <p>Delete Board</p>
                    </button>
                    <button onclick="deleteLastingToast()" class="font_prime_color std_btn toast_cancel d_flex_sc_gs">
                        <p class="w_full">Cancel</p>
                    </button>
                </div>
            </article>`
    showToastLastingMessage(true, htmltext)
}