/**
 * Stores authentication credentials in localStorage.
 * @param {string} token - The authentication token.
 * @param {string|number} userId - The user's unique identifier.
 * @param {string} email - The user's email address.
 * @param {string} fullname - The user's full name.
 */
function setAuthCredentials(token, userId, email, fullname) {
    localStorage.setItem('auth-token', token);
    localStorage.setItem('auth-user-id', userId);
    localStorage.setItem('auth-email', email);
    localStorage.setItem('auth-fullname', fullname);
}

/**  
 * Removes authentication credentials from localStorage.
 */
function removeAuthCredentials() {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-user-id');
    localStorage.removeItem('auth-email');
    localStorage.removeItem('auth-fullname');
}

/**
 * Retrieves the authentication token from localStorage.
 * @returns {string|null} The authentication token, or null if not found.
 */
function getAuthToken() {
    return localStorage.getItem('auth-token');
}

/**
 * Retrieves the authenticated user's ID from localStorage.
 * @returns {string|null} The user ID, or null if not found.
 */
function getAuthUserId() {
    return localStorage.getItem('auth-user-id');
}

/**
 * Retrieves the authenticated user's email address from localStorage.
 * @returns {string|null} The email address, or null if not found.
 */
function getAuthEmail() {
    return localStorage.getItem('auth-email');
}

/**
 * Retrieves the authenticated user's full name from localStorage.
 * @returns {string|null} The full name, or null if not found.
 */
function getAuthFullname() {
    return localStorage.getItem('auth-fullname');
}

/**
 * Retrieves the authenticated user's information from localStorage.
 * @returns {Object} An object containing id, initials, fullname, and email of the user.
 */
function getAuthUser(){
    let fullname = getAuthFullname();
    let user = {
        "id": getAuthUserId(),
        "initials": getInitials(fullname),
        "fullname": fullname,
        "email": getAuthEmail()
    }
    return user
}

/**
 * Checks if the given email address exists by sending a request to the backend.
 * @param {string} mail - The email address to check.
 * @returns {Promise<Object|boolean>} Returns the user data if found, otherwise false.
 */
async function checkMailAddress(mail){
    // let mailResp = await getData(`${MAIL_CHECK_URL}?email=${encodeURIComponent(mail)}`);
    let mailResp = await getData(`${MAIL_CHECK_URL}?email=${mail}`);
    if (mailResp.ok) {
        return mailResp.data;
    } else {
        return false
    }
}

/**
 * Creates HTTP headers for API requests, including the Authorization header if a token is present.
 * @returns {Object} An object containing HTTP headers.
 */
function createHeaders() {
    const headers = {};

    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = `Token ${token}`;
    }

    return headers;
}

/**
 * Returns a user-friendly error message based on the error type.
 * @param {Error} error - The error object to interpret.
 * @returns {string} A user-friendly error message.
 */
function getErrorMessage(error) {
    let errorMessage = 'Network error';

    if (error instanceof TypeError) {
        errorMessage = 'There was an issue with the request or network connection.';
    } else if (error instanceof SyntaxError) {
        errorMessage = 'Response was not valid JSON.';
    } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Failed to connect to the server.';
    }

    return errorMessage;
}

/**
 * Converts a form's data into a plain object with key-value pairs.
 * @param {HTMLFormElement} form - The form element to extract data from.
 * @returns {Object} An object containing the form's data as key-value pairs.
 */
function getFormData(form){
    const formData = new FormData(form);
    return Object.fromEntries(formData.entries());
}

/**
 * Sends a GET request to the specified API endpoint and returns the response data.
 * Handles network and parsing errors, returning a consistent response object.
 * @param {string} endpoint - The API endpoint (relative to API_BASE_URL).
 * @returns {Promise<Object>} The response object containing ok, status, and data or error message.
 */
async function getData(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: createHeaders(),
        });
        const responseData = await response.json();
        return {
            ok: response.ok,
            status: response.status,
            data: responseData
        };

    } catch (error) {
        const errorMessage = getErrorMessage(error);
        return {
            ok:false,
            status: 'error',
            message: errorMessage
        };
    }
}

/**
 * Sends a POST request with JSON data to the specified API endpoint and returns the response data.
 * Handles network and parsing errors, returning a consistent response object.
 * @param {string} endpoint - The API endpoint (relative to API_BASE_URL).
 * @param {Object} data - The data to be sent in the request body.
 * @returns {Promise<Object>} The response object containing ok, status, and data or error message.
 */
async function postData(endpoint, data) {
    
    let header = createHeaders();
    header['Content-Type'] = 'application/json';
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: header,
            body: JSON.stringify(data)
        });
        
        const responseData = await response.json();
        return {
            ok: response.ok,
            status: response.status,
            data: responseData
        };
        
    } catch (error) {
        const errorMessage = getErrorMessage(error);
        return {
            ok:false,
            status: 'error',
            message: errorMessage
        };
    }
}

/**
 * Sends a PATCH request with JSON data to the specified API endpoint and returns the response data.
 * Handles network and parsing errors, returning a consistent response object.
 * @param {string} endpoint - The API endpoint (relative to API_BASE_URL).
 * @param {Object} data - The data to be sent in the request body.
 * @returns {Promise<Object>} The response object containing ok, status, and data or error message.
 */
async function patchData(endpoint, data) {
    let header = createHeaders();
    header['Content-Type'] = 'application/json';
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: header,
            body: JSON.stringify(data)
        });

        const responseData = await response.json();
        return {
            ok: response.ok,
            status: response.status,
            data: responseData
        };

    } catch (error) {
        const errorMessage = getErrorMessage(error);
        return {
            ok:false,
            status: 'error',
            message: errorMessage
        };
    }
}

/**
 * Sends a DELETE request to the specified API endpoint and returns the response data if available.
 * Handles network and parsing errors, returning a consistent response object.
 * @param {string} endpoint - The API endpoint (relative to API_BASE_URL).
 * @returns {Promise<Object>} The response object containing ok, status, and data or error message.
 */
async function deleteData(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: createHeaders(),
        });
        let responseData = null;
        if (response.status !== 204) {
            responseData = await response.json();
        }
        return {
            ok: response.ok,
            status: response.status,
            data: responseData
        };

    } catch (error) {
        const errorMessage = getErrorMessage(error);
        return {
            ok:false,
            status: 'error',
            message: errorMessage
        };
    }
}