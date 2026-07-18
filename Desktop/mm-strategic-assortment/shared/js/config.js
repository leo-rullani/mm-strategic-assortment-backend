/**
 * Example user credentials for guest login (optional, can be offered as a button in the frontend).
 * @constant {Object}
 */
const GUEST_LOGIN = {
    email: "guest@kanmind.local.ch",
    password: "GuestDemo123!"
};

/**
 * Base URL for all API endpoints.
 * @constant {string}
 */
const API_BASE_URL = 'http://127.0.0.1:8000/api/';

/**
 * API endpoint for user login (relative to API_BASE_URL).
 * @constant {string}
 */
const LOGIN_URL = 'login/';

/**
 * API endpoint for user registration (relative to API_BASE_URL).
 * @constant {string}
 */
const REGISTER_URL = 'registration/';

/**
 * URL des GFX Manuals (statische PDF außerhalb der Git-Repos).
 * Auf Prod verweist /manuals/... per Nginx auf /srv/manuals/.
 * Bei Bedarf lokal auf eine absolute URL ändern.
 * @constant {string}
 */
const GFX_MANUAL_URL = '/manuals/bbm_gfx_manual.pdf';

/**
 * API endpoint for boards (relative to API_BASE_URL).
 * @constant {string}
 */
const BOARDS_URL = 'boards/';

/**
 * API endpoint for email address checking (relative to API_BASE_URL).
 * @constant {string}
 */
const MAIL_CHECK_URL = 'email-check/';

/**
 * API endpoint for tasks (relative to API_BASE_URL).
 * @constant {string}
 */
const TASKS_URL = 'tasks/';

/**
 * API endpoint for tasks assigned to the current user (relative to API_BASE_URL).
 * @constant {string}
 */
const TASKS_ASSIGNED_URL = 'tasks/assigned-to-me/';

/**
 * API endpoint for tasks where the current user is the reviewer (relative to API_BASE_URL).
 * @constant {string}
 */
const TASKS_REVIEWER_URL = 'tasks/reviewing/';