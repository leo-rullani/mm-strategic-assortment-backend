/**
 * Array holding the tickets currently assigned to the user.
 * @type {Array}
 */
let currentAssignedTickets = [];

/**
 * Array holding the tickets where the user is a reviewer.
 * @type {Array}
 */
let currentReviewerTickets = [];

/**
 * Array holding all boards available to the user.
 * @type {Array}
 */
let currentBoards = [];

/**
 * Current filter for tasks on the dashboard ("assigned", "reviewer", etc.).
 * @type {string}
 */
let currenTaskFilter = "assigned"

/**
 * Indicates whether tasks are currently being loaded.
 * @type {boolean}
 */
let isLoadingTasks = false;


/**
 * Initializes the dashboard by setting data and rendering the dashboard UI.
 * @returns {Promise<void>}
 */
async function init(){
    await setDashboardData();
    renderDashboard();
}

/**
 * Fetches and sets the boards and assigned tasks data for the dashboard.
 * @returns {Promise<void>}
 */
async function setDashboardData(){
    await getBoards();
    await getAssignedTasks();
}

/**
 * Fetches the list of boards from the backend and updates the currentBoards array.
 * Logs a warning if the request fails.
 * @returns {Promise<void>}
 */
async function getBoards() {
    let boardsResp = await getData(BOARDS_URL);

    if (boardsResp.ok) {
        currentBoards = boardsResp.data;
    } else {
        console.warn("BOARDS_URL loadingerror")
    }
}

/**
 * Fetches the list of assigned tasks from the backend and updates the currentAssignedTickets array.
 * Logs a warning if the request fails.
 * @returns {Promise<void>}
 */
async function getAssignedTasks() {
    let tasksResp = await getData(TASKS_ASSIGNED_URL);

    if (tasksResp.ok) {
        currentAssignedTickets = tasksResp.data;
    } else {
        console.warn("TASKS_ASSIGNED_URL loadingerror")
    }
}

/**
 * Fetches the list of reviewer tasks from the backend and updates the currentReviewerTickets array.
 * Logs a warning if the request fails.
 * @returns {Promise<void>}
 */
async function getReviewerTasks() {
    let tasksResp = await getData(TASKS_REVIEWER_URL);

    if (tasksResp.ok) {
        currentReviewerTickets = tasksResp.data;
    } else {
        console.warn("TASKS_REVIEWER_URL loadingerror")
    }
}

/**
 * Renders the entire dashboard UI, including welcome message, urgent tasks,
 * charts, board list, and task list.
 */
function renderDashboard() {
    renderWelcomeMessage();
    renderUrgentTask();
    let progress = currentAssignedTickets.filter(task => task.status == "done").length / currentAssignedTickets.length * 100;
    drawWaveChart(progress);
    drawPieChart(currentAssignedTickets);
    renderBoardList();
    renderMemberAndTaskCount();
    renderTaskList();
}

/**
 * Renders a personalized greeting for the authenticated user in the dashboard UI.
 * Uses the current hour to choose between:
 *   - Good morning   (05–11)
 *   - Good afternoon (12–16)
 *   - Good evening   (17–21)
 *   - Good night     (22–04)
 * Keeps the handshake icon in front of the greeting.
 */
function renderWelcomeMessage() {
    const user  = getAuthUser();
    const hour  = new Date().getHours();

    let greeting = "Good night";                 // default (22–04)
    if (hour >= 5  && hour < 12) greeting = "Good morning";
    else if (hour >= 12 && hour < 17) greeting = "Good afternoon";
    else if (hour >= 17 && hour < 22) greeting = "Good evening";

    document.getElementById('welcome_message').innerHTML =
        `<img src="../../assets/icons/shake_hands.png" alt=""><span class="font_white_color"> ${greeting}, </span>${user.fullname}!`;
}

/**
 * Renders the list of boards available to the user in the dashboard UI.
 * Displays a message if no boards are available.
 */
function renderBoardList() {
    let htmlText = "";
    currentBoards.forEach(board => {
        htmlText += `<li><a class="link" href="../../pages/board/?id=${board.id}">${board.title}</a></li>`;
    });
    if (currentBoards.length <= 0) {
        htmlText = `<h3 class="font_prime_color">No boards available</h3>`;
    }
    document.getElementById('dashboard_boardlist').innerHTML = htmlText;
}

/**
 * Toggles the task type switch between "assignee" and "review" modes.
 * Updates the task filter, renders the corresponding task list,
 * and prevents concurrent toggling during loading.
 * @param {HTMLElement} element - The switch element being toggled.
 * @returns {Promise<void>}
 */
async function toggleTicketsTypeSwitch(element){
    if(!isLoadingTasks){
        toggleSwitch(element)
        isLoadingTasks = true;
        if(currenTaskFilter == "review"){
            currenTaskFilter = "assignee"
        } else {
            currenTaskFilter = "review"
        }
        await renderTaskList()
        isLoadingTasks = false;
    }
}

/**
 * Renders the task list on the dashboard based on the current task filter.
 * Fetches the appropriate tasks (assigned or review) and updates the UI.
 * @returns {Promise<void>}
 */
async function renderTaskList(){
    let renderList = []
    if(currenTaskFilter == "review"){
        await getReviewerTasks()
        renderList = currentReviewerTickets
    } else {
        await getAssignedTasks()
        renderList = currentAssignedTickets
    }

    document.getElementById('dashboard_tasklist').innerHTML = getTaskListTemplate(renderList);
}

/**
 * Generates the HTML template for the list of tasks on the dashboard.
 * Returns a message if no tasks are available.
 * @param {Array<Object>} renderList - Array of task objects to render.
 * @returns {string} The HTML string for the task list.
 */
function getTaskListTemplate(renderList){
    let htmlText = "";
    renderList.forEach(task => {
        htmlText += getSingleTaskTemplate(task)
    });
    if(renderList.length <= 0){
        htmlText = `<h3 class="font_prime_color">No tasks available</h3>`
    }
    return htmlText;
}

/**
 * Generates the HTML template for a single task row in the dashboard task list.
 * @param {Object} task - The task object containing all task details.
 * @returns {string} The HTML string representing the task row.
 */
function getSingleTaskTemplate(task) {
    let assigneeTemplate = task.assignee ? 
        `<div class="profile_circle color_${getInitials(task.assignee.fullname)[0]}">${getInitials(task.assignee.fullname)}</div>` : 
        `<img src="../../assets/icons/face_icon.svg" alt="">`

    return `        <tr onclick="redirectToBoardWTask(${task.id})">
                        <td class="title">${task.title}</td>
                        <td class="ws_nw">${task.due_date}</td>
                        <td>
                            <div class="priority-badge" priority="${task.priority}"></div>
                        </td>
                        <td class="ws_nw">${task.status}</td>
                        <td class="d_flex_cc_gs task_count" zero="${task.comments_count==0}"> 
                            <p class="font_sec_color">${task.comments_count}</p> 
                            <img src="../../assets/icons/comment_bubble_filled.svg" alt="" srcset="">
                            <img src="../../assets/icons/comment_bubble_empty.svg" alt="" srcset="">
                        </td>
                        <td>
                            ${assigneeTemplate}
                        </td>
                    </tr>`
}

/**
 * Redirects the user to the board page for the given task, including the board and task ID in the URL.
 * @param {number|string} taskId - The unique identifier of the task.
 */
function redirectToBoardWTask(taskId){
    let task = currentAssignedTickets.find(task => task.id == taskId)
    window.location.href = `../../pages/board/?id=${task.board}&task_id=${task.id}`
}

/**
 * Renders the count of assigned tasks and the number of boards not owned by the current user.
 * Updates the corresponding UI elements in the dashboard.
 */
function renderMemberAndTaskCount(){
    let userId = getAuthUserId()
    document.getElementById('dashboard_task_count').innerText = currentAssignedTickets.length;
    document.getElementById('dashboard_member_count').innerText = currentBoards.filter(board => board.owner_id != userId).length;
}

/**
 * Renders the most urgent task and the count of high priority tasks.
 * Updates the UI elements for high priority count and upcoming deadline.
 */
function renderUrgentTask(){
    let task = getNearestDueDateTask();
    let count = currentAssignedTickets.filter(task => task.priority == "high").length;
    document.getElementById('high_prio_count').innerText = count
    document.getElementById('upcoming_deadline').innerText = task ? formatDate(task.due_date) : "no upcoming deadline";
}

/**
 * Finds and returns the assigned task with the nearest due date that is not overdue.
 * @returns {Object|null} The task object with the nearest upcoming due date, or null if none found.
 */
function getNearestDueDateTask() {
    const today = new Date();
    let nearestTask = null;
    let minDiff = Infinity;

    currentAssignedTickets.forEach(task => {
        const dueDate = new Date(task.due_date);
        const diff = dueDate - today;

        if (diff >= 0 && diff < minDiff) {
            minDiff = diff;
            nearestTask = task;
        }
    });

    return nearestTask;
}

/**
 * Formats an ISO date string into a human-readable date string (e.g., "April 21, 2025").
 * @param {string} isoDate - The ISO date string to format.
 * @returns {string} The formatted date string in "Month Day, Year" format.
 */
function formatDate(isoDate) {
    const date = new Date(isoDate);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Redirects the user to the boards overview page.
 */
function redirectToBoards(){
    window.location.href = "../../pages/boards/"
}

/* ───────── Our-Portfolio Marquee ───────── */
/**
 * Initializes the portfolio marquee animation for the `.portfolio-track` element.
 *
 * Process:
 * 1. Reads the original list items from `.portfolio-track`.
 * 2. Clears the track and rebuilds it with alternating styles.
 * 3. Inserts a "OUR PORTFOLIO" banner after every 7 items.
 * 4. Duplicates the sequence to create an infinite loop effect.
 * 5. Calculates and sets CSS custom properties for the animation distance and duration.
 *
 * Expected CSS variables set:
 * - `--marquee-distance`: total horizontal scroll distance.
 * - `--marquee-duration`: duration of the marquee animation in seconds.
 *
 * @returns {void}
 */
function initPortfolioMarquee() {
    const track = document.querySelector('.portfolio-track');
    if (!track) return;

    // 1. Collect original items
    const originalItems = Array.from(track.children).map(li => li.textContent.trim());

    // 2. Clear the track & rebuild
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
        // Create the event item
        const li = document.createElement('li');
        li.textContent = txt;
        if (idx % 2 === 1) li.classList.add('portfolio-item-alt');   // alternate styling
        track.appendChild(li);
        counter++;

        // After every 7 items → insert the banner
        if (counter % 7 === 0) {
            const bannerLi = document.createElement('li');
            bannerLi.innerHTML = bannerHTML;
            track.appendChild(bannerLi);
        }
    });

    // 3. Duplicate the sequence → endless loop effect
    track.innerHTML += track.innerHTML;

    // 4. Set marquee variables
    const SPEED = 60;                       // px / second
    const trackWidth = track.scrollWidth / 2;
    const duration = trackWidth / SPEED;

    track.style.setProperty('--marquee-distance', `${trackWidth}px`);
    track.style.setProperty('--marquee-duration', `${duration}s`);
}

/* Initialize after DOM load */
window.addEventListener('load', initPortfolioMarquee);