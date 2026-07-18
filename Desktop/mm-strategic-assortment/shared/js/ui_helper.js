/**
 * Stops the propagation of the given event.
 * @param {Event} event - The event to stop propagation for.
 */
function stopProp(event) {
    event.stopPropagation()
}

/**
 * Prevents the default action of the given event.
 * @param {Event} event - The event to prevent default on.
 */
function prevDef(event) {
    event.preventDefault();
}

/**
 * Closes a dialog by adding the 'd_none' class to hide it.
 * @param {string} id - The ID of the dialog element to close.
 */
function closeDialog(id) {
    let dialogref = document.getElementById(id);
    dialogref.classList.add('d_none');
}

/**
 * Resets all dialogs marked as currently active by setting their 'current_dialog' attribute to 'false'.
 */
function resetCurrentDialogs() {
    const dialogElements = document.querySelectorAll('[current_dialog="true"]');
    dialogElements.forEach(el => {
      el.setAttribute('current_dialog', 'false');
    });
}

/**
 * Toggles the 'open' attribute of an element between 'true' and 'false'.
 * @param {HTMLElement} element - The element to toggle.
 */
function toggleOpen(element) {
    const isOpen = element.getAttribute('open') === 'true';
    element.setAttribute('open', !isOpen);
}

/**
 * Toggles the 'open' attribute of the element with the specified ID between 'true' and 'false'.
 * @param {string} id - The ID of the element to toggle.
 */
function toggleOpenId(id) {
    const element = document.getElementById(id)
    const isOpen = element.getAttribute('open') === 'true';
    element.setAttribute('open', !isOpen);
}

/**
 * Closes the element with the specified ID by setting its 'open' attribute to 'false'.
 * @param {string} id - The ID of the element to close.
 */
function closeOpenId(id) {
    const element = document.getElementById(id)
    element.setAttribute('open', 'false');
}

/**
 * Sets or clears the error attribute on an element by ID.
 * @param {boolean} valid - Whether the input is valid (true means no error).
 * @param {string} id - The ID of the element to set the error attribute on.
 */
function setError(valid, id) {
    document.getElementById(id).setAttribute("error", valid)
}

/**
 * Returns the initials of a given full name.
 * Works with one‑part or multi‑part names and is null‑safe.
 *
 * @param {string} fullname – e.g. "John Doe"   |  "Madonna" | ""
 * @returns {string} e.g. "JD", "M", "?"
 */
function getInitials(fullname) {
    if (!fullname || typeof fullname !== "string") {
        return "?";
    }

    const parts = fullname.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
        return "?";
    }

    if (parts.length === 1) {
        return parts[0][0].toUpperCase();
    }

    return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Toggles the "active" class on the given element.
 * @param {HTMLElement} element - The element to toggle the class on.
 */
function toggleSwitch(element) {
    element.classList.toggle("active");
}

/**
 * Toggles the visibility of a password input field and updates the icon accordingly.
 * @param {HTMLElement} icon - The icon element that was clicked to toggle password visibility.
 */
function togglePassword(icon) {
    const container = icon.closest(".form_group_w_icon_wo_label");
    const input = container.querySelector("input[type='password'], input[type='text']");

    if (input) {
        if (input.type === "password") {
            input.type = "text";
            icon.src = "../../assets/icons/pw_visibility_off.svg"; 
        } else {
            input.type = "password";
            icon.src = "../../assets/icons/pw_visibility.svg";
        }
    }
}

/**
 * Toggles the visibility of a dropdown menu.
 * Closes all other open dropdowns before toggling the target dropdown.
 * @param {HTMLElement} button - The button that triggers the dropdown toggle.
 * @param {Event} event - The event object associated with the toggle action.
 */
function toggleDropdown(button, event) {
    closeAllDropdowns(event)
    const dropdown = button.closest(".dropdown");
    dropdown.classList.toggle("open");
}

/**
 * Closes all open dropdown menus except the one that contains the event target.
 * @param {Event} event - The event to check against dropdown contents.
 */
function closeAllDropdowns(event) {
    document.querySelectorAll('.dropdown.open').forEach(dropdown => {
        if (!dropdown.contains(event.target)) {
            dropdown.classList.remove('open');
        }
    });
}

/**
 * Recursively extracts error messages from a nested error object.
 * @param {Object} errorObject - The error object to extract messages from.
 * @returns {Array} An array of error message strings.
 */
function extractErrorMessages(errorObject) {
    let errorMessages = [];

    for (let key in errorObject) {
        if (errorObject.hasOwnProperty(key)) {
            const value = errorObject[key];
            if (typeof value === 'object' && value !== null) {
                errorMessages = errorMessages.concat(extractErrorMessages(value));
            } else if (Array.isArray(value)) {
                errorMessages = errorMessages.concat(value);
            } else {
                errorMessages.push(value);
            }
        }
    }

    return errorMessages;
}

/**
 * Shows a temporary toast message on the screen.
 * Automatically removes the toast after 2.5 seconds.
 * @param {boolean} [error=true] - Whether the toast represents an error.
 * @param {Array<string>} [msg=[]] - The message(s) to display in the toast.
 */
function showToastMessage(error = true, msg = []) {
    const toast = document.createElement('div');
    toast.className = 'toast_msg d_flex_cc_gm pad_s';
    toast.innerHTML = getToastHTML(msg, error);
    toast.setAttribute('error', error);
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2500);
}

/**
 * Shows a persistent toast message that remains until explicitly removed.
 * Updates or creates a global toast element with the given HTML content.
 * @param {boolean} [error=true] - Whether the toast represents an error.
 * @param {string} [html=""] - The HTML content to display inside the toast.
 */
let globalToast = null;

function showToastLastingMessage(error = true, html = "") {
    if (!globalToast) {
        globalToast = document.createElement('div');
        globalToast.className = 'toast_msg d_flex_cc_gm pad_s';
        document.body.appendChild(globalToast);
    }
    globalToast.innerHTML = `<div class="toast_msg_left d_flex_cc_gm">
            </div>
            <div class="toast_msg_right">
                    ${html}
            </div>`;
    globalToast.setAttribute('error', error);
}

/**
 * Removes the persistent global toast message from the DOM if it exists.
 */
function deleteLastingToast() {
    if (globalToast) {
        globalToast.remove();
        globalToast = null;
    }
}

/**
 * Generates the HTML content for a toast message.
 * Displays a success or error header and a list of messages.
 * @param {Array<string>} msg - Array of message strings to display.
 * @param {boolean} error - Indicates if the toast is for an error (true) or success (false).
 * @returns {string} The HTML string for the toast content.
 */
function getToastHTML(msg, error) {
    let msglist = "";
    if (msg.length <= 0) {
        msglist = error ? "<li>An error has occurred</li>" : "<li>That worked!</li>"
    }
    for (let i = 0; i < msg.length; i++) {
        msglist += `<li>${msg[i]}</li>`
    }

    return `<div class="toast_msg_left d_flex_cc_gm">
            </div>
            <div class="toast_msg_right">
                <h3 error="false">Success</h3>
                <h3 error="true">Error</h3>
                <ul class="w_full">
                    ${msglist}
                </ul>
            </div>`
}

/**
 * Calculates and returns a human-readable string representing the time difference
 * between the current time and a given timestamp.
 * @param {string|number|Date} timestamp - The timestamp to compare against the current time.
 * @returns {string} A string like "2 hours ago" or "just now" ("gerade eben").
 */
function timeDifference(timestamp) {
    const time = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - time) / 1000);

    const units = [
        { single_name: "year", plural_name: "years", seconds: 31536000 },
        { single_name: "month", plural_name: "months", seconds: 2592000 },
        { single_name: "day", plural_name: "days", seconds: 86400 },
        { single_name: "hour", plural_name: "hours", seconds: 3600 },
        { single_name: "minute", plural_name: "minutes", seconds: 60 },
        { single_name: "second", plural_name: "seconds", seconds: 1 }
    ];

    for (let unit of units) {
        const count = Math.floor(diffInSeconds / unit.seconds);
        if (count >= 1) {
            return `${count} ${count > 1 ? unit.plural_name : unit.single_name} ago`;
        }
    }
    return "gerade eben";
}

/**
 * Retrieves the value of a query parameter from the current URL.
 * @param {string} param - The name of the URL parameter to retrieve.
 * @returns {string|null} The value of the parameter or null if not found.
 */
function getParamFromUrl(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Redirects the user to the dashboard if authenticated,
 * otherwise redirects to the login page.
 * On boards pages, block only automatic redirects; allow manual clicks.
 */
function redirectToDashboard(manual = false) {
  const p = (window.location && window.location.pathname) || '';

  // Block NUR Auto-Redirects auf Boards/Board-Seiten
  if (!manual && (p.includes('/pages/boards') || p.includes('/boards') || p.includes('/pages/board') || p.includes('/board'))) {
    return;
  }

  if (getAuthUserId()) {
    window.location.href = "../../pages/dashboard/";
  } else {
    window.location.href = "../../pages/auth/login.html";
  }
}

// manual clicks
function goDashboard() {
  return redirectToDashboard(true);
}