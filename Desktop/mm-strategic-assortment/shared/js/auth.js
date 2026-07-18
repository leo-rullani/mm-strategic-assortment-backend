/**
 * Stores the values entered in the signup form.
 * @type {Object}
 * @property {string} fullname - The full name of the user.
 * @property {string} email - The email address of the user.
 * @property {string} password - The password entered by the user.
 * @property {string} repeated_password - The repeated password for confirmation.
 */
let signUpValues = {
    "fullname": "",
    "email": "",
    "password": "",
    "repeated_password": ""
}

/**
 * Handles the signup form submission.
 * Prevents default form submission, validates the form, and if valid, calls the registration function.
 * @param {Event} event - The form submission event.
 * @returns {Promise<void>}
 */
async function signUpSubmit(event) {
    event.preventDefault();
    let isFormValid = validateSignUp();
    if (isFormValid) {
        registration(signUpValues)
    }
}

/**
 * Sends registration data to the backend and handles the response.
 * Shows error messages if registration fails, otherwise saves auth credentials and redirects to the dashboard.
 * @param {Object} data - The registration data including fullname, email, password, etc.
 * @returns {Promise<void>}
 */
async function registration(data) {
    let response = await postData(REGISTER_URL, data);
    if (!response.ok) {
        let errorArr = extractErrorMessages(response.data)
        showToastMessage(true, errorArr)
    } else {
        setAuthCredentials(response.data.token, response.data.user_id, response.data.email, response.data.fullname)
        window.location.href = "../dashboard/index.html"
    }
}

/**
 * Handles the login form submission.
 * Prevents default form submission, clears any previous errors, extracts form data, and calls the logIn function.
 * @param {Event} event - The form submission event.
 * @returns {Promise<void>}
 */
async function logInSubmit(event) {
    event.preventDefault();
    setError(false, "error_login")
    const data = getFormData(event.target);
    await logIn(data)
}

/**
 * Sends login data to the backend and handles the response.
 * Shows error message if login fails, otherwise saves auth credentials and redirects to the dashboard.
 * @param {Object} data - The login data including email and password.
 * @returns {Promise<void>}
 */
async function logIn(data) {
    let response = await postData(LOGIN_URL, data);
    if (!response.ok) {
        setError(true, "error_login")
    } else {
        setAuthCredentials(response.data.token, response.data.user_id, response.data.email, response.data.fullname)
        window.location.href = "../dashboard/index.html"
    }
}

/**
 * Performs a guest login using predefined guest credentials.
 * Clears any previous login errors before attempting login.
 */
function guestLogin() {
    setError(false, "error_login")
    logIn(GUEST_LOGIN)
}

/**
 * Validates the fullname input field using a regex pattern.
 * Updates the signup values if valid and sets or clears error state.
 * @param {HTMLInputElement} element - The fullname input element.
 */
function validateFullname(element) {
    const nameRegex = /^[a-zäöüß]+(?: [a-zäöüß]+){1,2}$/i;
    let valid = nameRegex.test(element.value.trim())
    setError(!valid, element.id + "_group")
    if (valid) {
        signUpValues.fullname = element.value.trim()
    }
}

/**
 * Validates the registration email input field.
 * Updates the signup values if the email is valid.
 * @param {HTMLInputElement} element - The email input element.
 */
function validateRegistrationEmail(element) {
    let valid = validateEmail(element)
    if (valid) {
        signUpValues.email = element.value.trim()
    }
}

/**
 * Validates the password input field for minimum length.
 * Updates the signup values if valid and triggers validation of the repeated password if present.
 * @param {HTMLInputElement} element - The password input element.
 */
function validatePW(element) {
    let valid = element.value.trim().length > 7;
    setError(!valid, element.id + "_group")

    if (valid) {
        signUpValues.password = element.value.trim()
    }

    let repeatedPwRef = document.getElementById("repeated_password")
    if (repeatedPwRef.value.trim().length > 0) {
        validateConfirmPW(repeatedPwRef)
    }
}

/**
 * Validates that the repeated password matches the original password.
 * Updates the signup values if the confirmation password is valid.
 * @param {HTMLInputElement} element - The repeated password input element.
 */
function validateConfirmPW(element) {
    let valid = document.getElementById("password").value.trim() == element.value.trim();
    setError(!valid, element.id + "_group")
    if (valid) {
        signUpValues.repeated_password = element.value.trim()
    }
}

/**
 * Validates that the privacy checkbox is checked.
 * Sets or clears error state accordingly.
 * @param {HTMLInputElement} element - The privacy checkbox input element.
 */
function validatePrivacyCheckbox(element) {
    setError(!element.checked, element.id + "_group")
}

/**
 * Validates that the login password input is not empty.
 * Sets or clears error state accordingly.
 * @param {HTMLInputElement} element - The login password input element.
 */
function validateLoginPW(element) {
    let valid = element.value.trim().length > 0;
    setError(!valid, element.id + "_group")
}

/**
 * Validates the email input field using a regex pattern.
 * Sets or clears error state and returns validation result.
 * @param {HTMLInputElement} element - The email input element.
 * @returns {boolean} True if the email is valid, false otherwise.
 */
function validateEmail(element) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    let valid = emailRegex.test(element.value.trim())
    setError(!valid, element.id + "_group")
    return valid;
}

/**
 * Validates all signup form fields and returns whether the form is valid.
 * Checks fullname, email, password, repeated password, and privacy checkbox.
 * @returns {boolean} True if all validations pass; false otherwise.
 */
function validateSignUp() {
    validateFullname(document.getElementById("fullname"))
    validateEmail(document.getElementById("email"))
    validatePW(document.getElementById("password"))
    validateConfirmPW(document.getElementById("repeated_password"))
    validatePrivacyCheckbox(document.getElementById("privacy_policy_checkbox"))

    const form = document.getElementById('sign_up_form');
    const elementWithErrorFalse = form.querySelector('[error="true"]');
    return elementWithErrorFalse == null
}