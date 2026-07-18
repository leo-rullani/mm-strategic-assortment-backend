/**
 * Logs out the current user by removing authentication credentials
 * and redirecting to the login page.
 */
function logOut() {
    removeAuthCredentials()
    window.location.href = "../auth/login.html";
}

/**
 * Sets up the header by rendering its template.
 * @returns {Promise<void>}
 */
async function setHeader() {
    setHeaderTemplate()
}

/**
 * Sets the header section's inner HTML by rendering the header template.
 */
function setHeaderTemplate() {
    let headerRef = document.getElementById('head_content_right')
    headerRef.innerHTML = getHeaderTemplate()
}

/**
 * Returns the appropriate header HTML template based on the current page URL.
 * Shows sign-up link on the login page, login link on the registration page,
 * and the logged-in header template otherwise.
 * @returns {string} The HTML string for the header.
 */
function getHeaderTemplate() {
    const currentUrl = window.location.href;
    
    if (currentUrl.endsWith('login.html')) {
        return `
        <div class="d_flex_cc_gm">
            <a href="./register.html" class="std_btn btn_prime pad_s d_flex_cc_gs">
                <img src="../../assets/icons/sign_up_icon.svg" alt="" srcset=""> 
                Sign up
            </a>
        </div>`
    } else if (currentUrl.endsWith('register.html')) {
        return `
        <div class="d_flex_cc_gm">
            <a href="./login.html" class="std_btn btn_prime pad_s d_flex_cc_gs">
                <img src="../../assets/icons/login_icon.svg" alt="" srcset=""> 
                Log in
            </a>
        </div>`
    } else {
        return getLogedInHeaderTemplate()
    }
}

/**
 * Closes all menu toggle buttons except the specified one by setting their 'open' attribute to 'false'.
 * @param {HTMLElement} element - The menu button element to keep open.
 */
function closeOtherMenuBtns(element) {
    let menuBtns = document.querySelectorAll('.menu_toggle')
    menuBtns.forEach(btn => {
        if (btn !== element) {
            btn.setAttribute('open', 'false')
        }
    })
}

/**
 * Returns the header HTML template for logged-in users.
 * Redirects to login if no authenticated user ID is found,
 * except on imprint or privacy pages.
 * @returns {string} The HTML string for the logged-in header.
 */
function getLogedInHeaderTemplate() {
    const currentUrl = window.location.href;
    let currentUserId = getAuthUserId();
    if(!currentUserId){
        if (currentUrl.endsWith('/imprint/index.html') || currentUrl.endsWith('/privacy/index.html')) {
            return `
            <div class="d_flex_cc_gm">
                <a href="../../pages/auth/login.html" class="std_btn btn_prime pad_s d_flex_cc_gs">
                    <img src="../../assets/icons/login_icon.svg" alt="" srcset=""> 
                    Log in
                </a>
            </div>`
        } else {
            window.location.href = "../auth/login.html"
        }
    }
    let currentUser = getAuthUser();
    return `
        <div class="menu_btn_wrapper">
            <button onclick="closeOtherMenuBtns(this); toggleOpen(this); stopProp(event)" closable="true" open="false" class="menu_toggle std_btn menu_btn pad_s d_flex_cc_gs">
                <img src="../../assets/icons/menu.svg" alt="" srcset="">
            </button>
            <div class="menu_content d_flex_cc_gm f_d_c">
                <p class="d_flex_sc_gm font_white_color" onclick="window.location.href = '../dashboard/index.html'">
                    <img src="../../assets/icons/dashboard.svg" alt="" srcset=""> 
                    Dashboard
                </p>
                <p class="d_flex_sc_gm font_white_color" onclick="window.location.href = '../boards/index.html'">
                    <img src="../../assets/icons/view_board_yellow.svg" alt="" srcset=""> 
                    Boards
                </p>
                <p class="d_flex_sc_gm font_white_color" onclick="window.location.href = '../requests/index.html'">
                    <img src="../../assets/icons/requests.svg" alt="" width="16" srcset=""> 
                    Requests
                </p>
            </div>
        </div>
        <div class="menu_btn_wrapper"> 
            <button onclick="closeOtherMenuBtns(this); toggleOpen(this); stopProp(event)" closable="true" open="false" class="menu_toggle profile_circle color_${currentUser.initials[0]}">${currentUser.initials}</button>   
            <div class="menu_content d_flex_cc_gm f_d_c">
                <p class="d_flex_cc_gm font_white_color" onclick="logOut()">
                    <img src="../../assets/icons/logout.svg" alt="" srcset=""> 
                    Log out 
                </p>
            </div>
        </div>`;
}