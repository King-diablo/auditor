const auditLogs = [
    {
        id: "standard_001",
        timestamp: "2025-07-03T08:00:00Z",
        type: "db",
        action: "update",
        user: "admin",
        message: "Updated user permissions",
        route: "/api/db"
    },
    {
        id: "standard_002",
        timestamp: "2025-07-03T07:15:00Z",
        type: "db",
        action: "delete",
        user: "editor",
        message: "Deleted article ID 123",
        stack: "at deleteArticle (cms.js:123)",
        route: "/api/db"
    },
    {
        id: "standard_003",
        timestamp: "2025-07-03T04:00:00Z",
        type: "db",
        action: "create",
        user: "admin",
        message: "Created new user",
        stack: "at createUser (user.js:33)",
        route: "/api/db"
    },
    {
        id: "standard_004",
        timestamp: "2025-07-03T04:00:00Z",
        type: "system",
        action: "error",
        user: "admin",
        message: "Created new user",
        stack: "at createUser (user.js:33)",
        route: "/api/db"
    },
];

function renderTable(logs) {
    const tbody = document.querySelector("#auditTable tbody");
    tbody.innerHTML = "";
    logs.forEach(log => {
        const row = document.createElement("tr");
        row.innerHTML = `
        <td>${log.id}</td>
        <td>${log.type}</td>
        <td>${log.action}</td>
        <td>${log.message}</td>
        <td>${log.route}</td>
        <td>${new Date(log.timestamp).toLocaleString()}</td>
        <td><button onclick='viewDetails(${JSON.stringify(log)})'>View</button></td>
      `;
        tbody.appendChild(row);
    });
}

function viewDetails(stack) {
    const modalText = document.getElementById("modalText");
    modalText.innerHTML = `
        <pre style="white-space:pre-wrap;word-break:break-word;">${JSON.stringify(stack, null, 4)}</pre>
    `;
    document.getElementById("modal").classList.remove("hidden");
}

document.getElementById("closeModal").onclick = () => {
    document.getElementById("modal").classList.add("hidden");
};

document.getElementById("searchInput").addEventListener("input", filterLogs);
document.getElementById("filterAction").addEventListener("change", filterLogs);

function filterLogs() {
    const search = document.getElementById("searchInput").value.toLowerCase();
    const action = document.getElementById("filterAction").value;

    const filtered = auditLogs.filter(log => {
        return (
            (!action || log.action === action) &&
            (log.message.toLowerCase().includes(search) ||
                log.user.toLowerCase().includes(search))
        );
    });

    renderTable(filtered);
    renderChart(filtered);
}

function renderChart(logs) {
    const hours = Array.from({ length: 24 }, (_, h) => `${h.toString().padStart(2, '0')}:00`);
    const actions = logs.map(x => x.action);
    const data = actions.reduce((acc, action) => {
        acc[action] = hours.map(() => 0);
        return acc;
    }, {});

    logs.forEach(log => {
        const hour = new Date(log.timestamp).getUTCHours();
        data[log.action][hour]++;
    });

    if (window.auditChartInstance) {
        window.auditChartInstance.destroy();
    }

    const isDark = document.body.classList.contains("dark-mode");

    const ctx = document.getElementById("auditChart").getContext("2d");
    window.auditChartInstance = new Chart(ctx, {
        type: "bar",

        data: {
            labels: hours,
            datasets: actions.map((action, i) => ({
                label: action.charAt(0).toUpperCase() + action.slice(1),
                data: data[action],
                // borderColor: ["green", "pink", "red"][i],
                backgroundColor: ["lime", "pink", "green", "red"][i],
                fill: false
            }))
        },
        options: {
            responsive: true,
            plugins: { legend: { position: "bottom" } },
            scales: {
                x: {
                    ticks: {
                        color: isDark ? "#f0f0f0" : "#000000"
                    },
                    grid: {
                        color: isDark ? "#444" : "#ccc"
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: isDark ? "#f0f0f0" : "#000000"
                    },
                    grid: {
                        color: isDark ? "#444" : "#ccc"
                    }
                },
            }
        },
    });
}

function exportChart() {
    const url = document.getElementById("auditChart").toDataURL("image/png");
    const link = document.createElement("a");
    link.download = "audit_chart.png";
    link.href = url;
    link.click();
}

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    renderChart(auditLogs);
}

function exportTableToCSV() {
    const rows = Array.from(document.querySelectorAll("#auditTable tr"));
    const csv = rows.map(row =>
        Array.from(row.children).map(cell => '"' + cell.innerText + '"').join(",")
    ).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "audit_logs.csv";
    link.click();
}

renderTable(auditLogs);
renderChart(auditLogs);

