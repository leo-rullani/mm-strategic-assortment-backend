/**
 * MM Strategic Assortment dashboard controller.
 */

let currentAssignedTickets = [];
let currentReviewerTickets = [];
let currentBoards = [];
let currenTaskFilter = "assigned";
let isLoadingTasks = false;
let portfolioResizeObserver = null;

async function init() {
    bindTaskListNavigation();
    await setDashboardData();
    await renderDashboard();
}

async function setDashboardData() {
    await Promise.all([getBoards(), getAssignedTasks()]);
}

async function getBoards() {
    try {
        const response = await getData(BOARDS_URL);
        currentBoards = response?.ok && Array.isArray(response.data)
            ? response.data
            : [];

        if (!response?.ok) console.warn("Could not load boards.");
    } catch (error) {
        currentBoards = [];
        console.warn("Could not load boards.", error);
    }
}

async function getAssignedTasks() {
    try {
        const response = await getData(TASKS_ASSIGNED_URL);
        currentAssignedTickets = response?.ok && Array.isArray(response.data)
            ? response.data
            : [];

        if (!response?.ok) console.warn("Could not load assigned tasks.");
    } catch (error) {
        currentAssignedTickets = [];
        console.warn("Could not load assigned tasks.", error);
    }
}

async function getReviewerTasks() {
    try {
        const response = await getData(TASKS_REVIEWER_URL);
        currentReviewerTickets = response?.ok && Array.isArray(response.data)
            ? response.data
            : [];

        if (!response?.ok) console.warn("Could not load review tasks.");
    } catch (error) {
        currentReviewerTickets = [];
        console.warn("Could not load review tasks.", error);
    }
}

async function renderDashboard() {
    renderWelcomeMessage();
    renderUrgentTask();

    const taskCount = currentAssignedTickets.length;
    const doneCount = currentAssignedTickets.filter(
        task => task?.status === "done"
    ).length;

    const progress = taskCount > 0
        ? (doneCount / taskCount) * 100
        : null;

    drawWaveChart(progress);
    drawPieChart(currentAssignedTickets);
    renderBoardList();
    renderMemberAndTaskCount();
    await renderTaskList();
}

function renderWelcomeMessage() {
    const container = document.getElementById("welcome_message");
    if (!container) return;

    const user = typeof getAuthUser === "function" ? getAuthUser() : null;
    const fullname = user?.fullname?.trim() || "there";
    const hour = new Date().getHours();

    let greeting = "Good night";
    if (hour >= 5 && hour < 12) greeting = "Good morning";
    else if (hour >= 12 && hour < 17) greeting = "Good afternoon";
    else if (hour >= 17 && hour < 22) greeting = "Good evening";

    container.textContent = `${greeting}, ${fullname}`;
}

function renderBoardList() {
    const boardList = document.getElementById("dashboard_boardlist");
    if (!boardList) return;

    const fragment = document.createDocumentFragment();

    if (!currentBoards.length) {
        const emptyItem = document.createElement("li");
        emptyItem.className = "dashboard-empty-state";
        emptyItem.textContent = "No boards available";
        fragment.appendChild(emptyItem);
    } else {
        currentBoards.forEach(board => {
            const item = document.createElement("li");
            const link = document.createElement("a");
            const boardId = board?.id ?? "";

            link.className = "link";
            link.href = `../../pages/board/?id=${encodeURIComponent(String(boardId))}`;
            link.textContent = board?.title?.trim() || "Untitled board";

            item.appendChild(link);
            fragment.appendChild(item);
        });
    }

    boardList.replaceChildren(fragment);
}

async function toggleTicketsTypeSwitch(element) {
    if (isLoadingTasks) return;

    isLoadingTasks = true;
    element?.setAttribute("aria-busy", "true");

    try {
        if (typeof toggleSwitch === "function") toggleSwitch(element);

        currenTaskFilter = currenTaskFilter === "review"
            ? "assigned"
            : "review";

        element?.setAttribute(
            "aria-checked",
            String(currenTaskFilter === "review")
        );

        await renderTaskList();
    } finally {
        isLoadingTasks = false;
        element?.removeAttribute("aria-busy");
    }
}

async function renderTaskList() {
    const taskList = document.getElementById("dashboard_tasklist");
    if (!taskList) return;

    let renderList = currentAssignedTickets;

    if (currenTaskFilter === "review") {
        await getReviewerTasks();
        renderList = currentReviewerTickets;
    }

    taskList.innerHTML = getTaskListTemplate(renderList);
}

function escapeHTML(value) {
    const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    };

    return String(value ?? "").replace(
        /[&<>"']/g,
        character => replacements[character]
    );
}

function getTaskListTemplate(renderList = []) {
    if (!Array.isArray(renderList) || renderList.length === 0) {
        return `
            <tr class="dashboard-empty-row">
                <td colspan="6">No tasks available</td>
            </tr>
        `;
    }

    return renderList.map(getSingleTaskTemplate).join("");
}

function getSingleTaskTemplate(task = {}) {
    const assignee = task.assignee;
    let assigneeTemplate = `
        <img src="../../assets/icons/face_icon.svg" alt="Unassigned" />
    `;

    if (assignee?.fullname) {
        const initials = typeof getInitials === "function"
            ? getInitials(assignee.fullname)
            : assignee.fullname
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(part => part[0])
                .join("")
                .toUpperCase();

        const colorKey = String(initials || "A")
            .charAt(0)
            .toUpperCase()
            .replace(/[^A-Z]/g, "A");

        assigneeTemplate = `
            <div
                class="profile_circle color_${colorKey}"
                title="${escapeHTML(assignee.fullname)}"
            >${escapeHTML(initials)}</div>
        `;
    }

    const commentsCount = Number.isFinite(Number(task.comments_count))
        ? Number(task.comments_count)
        : 0;

    return `
        <tr data-task-id="${escapeHTML(task.id)}" tabindex="0">
            <td class="title">${escapeHTML(task.title || "Untitled task")}</td>
            <td class="ws_nw">${escapeHTML(task.due_date || "—")}</td>
            <td>
                <div
                    class="priority-badge"
                    priority="${escapeHTML(task.priority || "none")}"
                    aria-label="Priority: ${escapeHTML(task.priority || "none")}"
                ></div>
            </td>
            <td class="ws_nw">${escapeHTML(task.status || "—")}</td>
            <td>
                <div class="d_flex_cc_gs task_count" zero="${commentsCount === 0}">
                    <p>${commentsCount}</p>
                    <img src="../../assets/icons/comment_bubble_filled.svg" alt="" />
                    <img src="../../assets/icons/comment_bubble_empty.svg" alt="" />
                </div>
            </td>
            <td>${assigneeTemplate}</td>
        </tr>
    `;
}

function bindTaskListNavigation() {
    const taskList = document.getElementById("dashboard_tasklist");
    if (!taskList || taskList.dataset.navigationBound === "true") return;

    taskList.dataset.navigationBound = "true";

    const openRow = event => {
        const row = event.target.closest("tr[data-task-id]");
        if (!row || !taskList.contains(row)) return;

        if (event.type === "keydown" && !["Enter", " "].includes(event.key)) {
            return;
        }

        if (event.type === "keydown") event.preventDefault();
        redirectToBoardWTask(row.dataset.taskId);
    };

    taskList.addEventListener("click", openRow);
    taskList.addEventListener("keydown", openRow);
}

function redirectToBoardWTask(taskId) {
    const normalizedId = String(taskId);
    const task = [...currentAssignedTickets, ...currentReviewerTickets]
        .find(item => String(item?.id) === normalizedId);

    if (!task) {
        console.warn("Task not found:", taskId);
        return;
    }

    const boardId = typeof task.board === "object"
        ? task.board?.id
        : task.board ?? task.board_id;

    if (boardId === null || boardId === undefined) {
        console.warn("Board ID missing for task:", task);
        return;
    }

    const target = new URL("../../pages/board/", window.location.href);
    target.searchParams.set("id", String(boardId));
    target.searchParams.set("task_id", String(task.id));
    window.location.assign(target.toString());
}

function renderMemberAndTaskCount() {
    const taskCount = document.getElementById("dashboard_task_count");
    const memberCount = document.getElementById("dashboard_member_count");
    const userId = typeof getAuthUserId === "function" ? getAuthUserId() : null;

    if (taskCount) taskCount.textContent = String(currentAssignedTickets.length);

    if (memberCount) {
        const collaborativeBoards = currentBoards.filter(
            board => String(board?.owner_id) !== String(userId)
        ).length;

        memberCount.textContent = String(collaborativeBoards);
    }
}

function renderUrgentTask() {
    const nearestTask = getNearestDueDateTask();
    const highPriorityCount = currentAssignedTickets.filter(
        task => task?.priority === "high"
    ).length;

    const priorityElement = document.getElementById("high_prio_count");
    const deadlineElement = document.getElementById("upcoming_deadline");

    if (priorityElement) priorityElement.textContent = String(highPriorityCount);
    if (deadlineElement) {
        deadlineElement.textContent = nearestTask
            ? formatDate(nearestTask.due_date)
            : "No upcoming deadline";
    }
}

function getNearestDueDateTask() {
    const now = new Date();
    let nearestTask = null;
    let minimumDifference = Infinity;

    currentAssignedTickets.forEach(task => {
        const dueDate = new Date(task?.due_date);
        const difference = dueDate.getTime() - now.getTime();

        if (
            Number.isFinite(difference) &&
            difference >= 0 &&
            difference < minimumDifference
        ) {
            minimumDifference = difference;
            nearestTask = task;
        }
    });

    return nearestTask;
}

function formatDate(isoDate) {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return date.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function redirectToBoards() {
    window.location.href = "../../pages/boards/";
}

const CORPORATE_VALUES = Object.freeze([
    "Customer first",
    "Own the outcome",
    "Make it simple",
    "Move with purpose",
    "Win together",
    "Speak with courage",
    "Learn every day",
    "Build trust",
    "Create impact",
    "Act responsibly"
]);

function createMarqueeItem(text, hidden = false) {
    const item = document.createElement("li");
    item.textContent = text;
    if (hidden) item.setAttribute("aria-hidden", "true");
    return item;
}

function initPortfolioMarquee() {
    const track = document.querySelector(".portfolio-track");
    if (!track) return;

    const firstSequence = CORPORATE_VALUES.map(value => createMarqueeItem(value));
    const duplicateSequence = CORPORATE_VALUES.map(
        value => createMarqueeItem(value, true)
    );

    track.replaceChildren(...firstSequence, ...duplicateSequence);

    const calculateMarquee = () => {
        const firstItem = track.children[0];
        const duplicateStart = track.children[CORPORATE_VALUES.length];
        if (!firstItem || !duplicateStart) return;

        const distance = duplicateStart.offsetLeft - firstItem.offsetLeft;
        const speed = 46;
        const duration = Math.max(22, distance / speed);

        track.style.setProperty("--marquee-distance", `${distance}px`);
        track.style.setProperty("--marquee-duration", `${duration}s`);
    };

    requestAnimationFrame(calculateMarquee);
    document.fonts?.ready?.then(calculateMarquee);

    portfolioResizeObserver?.disconnect();
    if (typeof ResizeObserver !== "undefined") {
        portfolioResizeObserver = new ResizeObserver(calculateMarquee);
        portfolioResizeObserver.observe(track);
    }
}

window.addEventListener("load", initPortfolioMarquee, { once: true });