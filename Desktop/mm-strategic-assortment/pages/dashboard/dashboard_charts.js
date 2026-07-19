/**
 * Dashboard charts for MM Strategic Assortment.
 * Existing Chart.js instances are destroyed before redraw so repeated renders
 * and hot reloads do not lock the canvas.
 */

function destroyChartForCanvas(canvas) {
    if (
        !canvas ||
        typeof Chart === "undefined" ||
        typeof Chart.getChart !== "function"
    ) {
        return;
    }

    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();
}

/**
 * Return ticket totals in dashboard status order.
 * @param {Array<Object>} tickets
 * @returns {Array<number>}
 */
function getPieChartData(tickets = []) {
    const safeTickets = Array.isArray(tickets) ? tickets : [];

    return [
        safeTickets.filter(task => task?.status === "to-do").length,
        safeTickets.filter(task => task?.status === "in-progress").length,
        safeTickets.filter(task => task?.status === "review").length,
        safeTickets.filter(task => task?.status === "done").length
    ];
}

/**
 * Draw the task status doughnut.
 * @param {Array<Object>} currentAssignedTickets
 */
function drawPieChart(currentAssignedTickets = []) {
    const canvas = document.getElementById("ticketsChart");
    if (!canvas || typeof Chart === "undefined") return;

    destroyChartForCanvas(canvas);

    const context = canvas.getContext("2d");
    if (!context) return;

    let data = getPieChartData(currentAssignedTickets);
    let labels = ["To do", "In progress", "Review", "Done"];
    const hasTickets = data.some(value => value > 0);

    if (!hasTickets) {
        data = [1];
        labels = ["No tasks assigned"];
    }

    const colors = hasTickets
        ? ["#777a82", "#ff653c", "#ffbd45", "#4bc68b"]
        : ["#34373e"];

    const total = hasTickets
        ? data.reduce((sum, value) => sum + value, 0)
        : 0;

    const centerLabelPlugin = {
        id: "dashboardDoughnutCenter",
        afterDraw(chart) {
            const meta = chart.getDatasetMeta(0);
            const firstArc = meta?.data?.[0];
            if (!firstArc) return;

            const { ctx } = chart;
            const centerX = firstArc.x;
            const centerY = firstArc.y;

            ctx.save();
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            ctx.fillStyle = "#f7f7f8";
            ctx.font = "800 34px Arial, sans-serif";
            ctx.fillText(String(total), centerX, centerY - 7);

            ctx.fillStyle = "#a5a8b0";
            ctx.font = "700 10px Arial, sans-serif";
            ctx.fillText(hasTickets ? "TOTAL TASKS" : "NO TASKS", centerX, centerY + 22);
            ctx.restore();
        }
    };

    new Chart(context, {
        type: "doughnut",
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderColor: "#202329",
                borderWidth: hasTickets ? 4 : 0,
                hoverOffset: hasTickets ? 8 : 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "70%",
            animation: {
                duration: 650
            },
            plugins: {
                legend: {
                    display: true,
                    position: "bottom",
                    labels: {
                        color: "#c8cad0",
                        usePointStyle: true,
                        pointStyle: "circle",
                        boxWidth: 8,
                        boxHeight: 8,
                        padding: 18,
                        font: {
                            size: 11,
                            weight: "700"
                        }
                    }
                },
                tooltip: {
                    enabled: hasTickets,
                    backgroundColor: "#101113",
                    titleColor: "#f7f7f8",
                    bodyColor: "#d4d5d9",
                    borderColor: "rgba(255,255,255,.14)",
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true
                }
            }
        },
        plugins: [centerLabelPlugin]
    });
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    const safeRadius = Math.min(radius, width / 2, height / 2);

    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
    ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
    ctx.arcTo(x, y + height, x, y, safeRadius);
    ctx.arcTo(x, y, x + width, y, safeRadius);
    ctx.closePath();
}

/**
 * Draw a segmented progress signal. The historic function name stays intact so
 * existing dashboard code remains compatible.
 * @param {number|null} progress
 */
function drawWaveChart(progress) {
    const canvas = document.getElementById("waveChart");
    if (!canvas || typeof Chart === "undefined") return;

    destroyChartForCanvas(canvas);

    const context = canvas.getContext("2d");
    if (!context) return;

    const numericProgress = Number(progress);
    const hasTasks =
        progress !== null &&
        progress !== undefined &&
        Number.isFinite(numericProgress);

    const safeProgress = hasTasks
        ? Math.min(100, Math.max(0, numericProgress))
        : 0;

    const signalPlugin = {
        id: "dashboardSignalProgress",
        beforeDraw(chart) {
            const { ctx, chartArea } = chart;
            if (!chartArea) return;

            const width = chartArea.right - chartArea.left;
            const centerY = chartArea.top + (chartArea.bottom - chartArea.top) * 0.68;
            const segments = 20;
            const gap = 5;
            const segmentWidth = (width - gap * (segments - 1)) / segments;
            const segmentHeight = 14;
            const activeSegments = Math.round((safeProgress / 100) * segments);

            ctx.save();

            ctx.fillStyle = "#f7f7f8";
            ctx.font = "850 38px Arial, sans-serif";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(
                hasTasks ? `${safeProgress.toFixed(1)}%` : "No assigned tasks",
                chartArea.left,
                chartArea.top + 32
            );

            ctx.fillStyle = "#a5a8b0";
            ctx.font = "700 11px Arial, sans-serif";
            ctx.fillText(
                hasTasks ? "COMPLETED SHARE" : "PROGRESS WILL APPEAR HERE",
                chartArea.left,
                chartArea.top + 65
            );

            for (let index = 0; index < segments; index += 1) {
                const x = chartArea.left + index * (segmentWidth + gap);
                const y = centerY - segmentHeight / 2;

                drawRoundedRect(ctx, x, y, segmentWidth, segmentHeight, 4);

                if (index < activeSegments) {
                    const gradient = ctx.createLinearGradient(x, y, x + segmentWidth, y);
                    gradient.addColorStop(0, "#df0000");
                    gradient.addColorStop(1, "#ff653c");
                    ctx.fillStyle = gradient;
                } else {
                    ctx.fillStyle = "#353840";
                }

                ctx.fill();
            }

            ctx.fillStyle = "#777a82";
            ctx.font = "700 10px Arial, sans-serif";
            ctx.textAlign = "left";
            ctx.fillText("0", chartArea.left, centerY + 28);
            ctx.textAlign = "right";
            ctx.fillText("100", chartArea.right, centerY + 28);

            ctx.restore();
        }
    };

    new Chart(context, {
        type: "bar",
        data: {
            labels: ["Progress"],
            datasets: [{
                data: [safeProgress],
                backgroundColor: "rgba(0,0,0,0)",
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 550
            },
            events: [],
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            layout: {
                padding: {
                    top: 4,
                    right: 2,
                    bottom: 4,
                    left: 2
                }
            },
            scales: {
                x: { display: false },
                y: { display: false, min: 0, max: 100 }
            }
        },
        plugins: [signalPlugin]
    });
}