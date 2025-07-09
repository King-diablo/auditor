async function fetchLogs() {
    try {
        const response = await fetch("/audit-log");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const logsText = await response.text();
        const cleaned = JSON.parse(logsText);
        const logs = cleaned.trim().split('\n').filter(Boolean); // split into lines

        const data = logs.map(line => JSON.parse(line)).map((item, index) => {
            return {
                id: index,
                ...item,
            };
        });
        return data;
    } catch (error) {
        console.error('Error fetching logs:', error);
        return null; // Return null to indicate failure
    }
}

async function getAuditLogs() {
    try {
        const logs = await fetchLogs();
        if (logs && logs.length > 0) {
            // console.log([new Set(logs.map(l => l.type))].map(i => i));
            return logs;
        }
        console.log("Using temporary logs as fallback");
        return [
            { id: 1, type: 'info', action: 'login', message: 'User logged in successfully', timeStamp: new Date(Date.now() - 3600000), details: { userId: 123, ip: '192.168.1.1' } },
            { id: 2, type: 'error', action: 'api_call', message: 'Failed to fetch user data', timeStamp: new Date(Date.now() - 7200000), details: { endpoint: '/api/users', status: 500 } },
            // Add more sample data as needed...
        ];
    } catch (error) {
        console.error('Error getting audit logs:', error);
        return []; // Return empty array as final fallback
    }
}


document.addEventListener('DOMContentLoaded', initDashboard);

// DOM Elements
const themeToggle = document.getElementById('themeToggle');
const timeRangeSelect = document.getElementById('timeRange');
const chartTypeSelect = document.getElementById('chartType');
const exportChartBtn = document.getElementById('exportChart');
const logTable = document.getElementById('logTable').querySelector('tbody');
const searchLogs = document.getElementById('searchLogs');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageNumbers = document.getElementById('pageNumbers');
const paginationInfo = document.getElementById('paginationInfo');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const closeSidebar = document.getElementById('closeSidebar');
const colorControls = document.getElementById('colorControls');
const resetColorsBtn = document.getElementById('resetColors');
const modal = document.getElementById('logModal');
const closeModal = document.querySelector('.close-modal');
const modalBody = document.getElementById('modalBody');
const entriesPerPage = document.getElementById('entriesPerPage');
const logTypeFilter = document.getElementById('logTypeFilter');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const applyCustomRangeBtn = document.getElementById('applyCustomRange');

// Chart variables
let logChart;
const DEFAULT_COLORS = {
    info: '#2196F3',      // Blue
    error: '#F44336',     // Red
    warning: '#FF9800',   // Orange
    success: '#4CAF50',   // Green
    signal: '#9C27B0',    // Purple
    system: '#607D8B',    // Blue Grey
    request: '#FF5722'    // Deep Orange
};
let currentColors = { ...DEFAULT_COLORS };

// Pagination variables
let logsPerPage = parseInt(localStorage.getItem('logsPerPage')) || 10;
let currentPage = 1;
let filteredLogs = [];
let logData = [];

// Initialize the dashboard
async function initDashboard() {
    const auditLogs = await getAuditLogs();
    filteredLogs = [...auditLogs];
    logData = auditLogs;
    setupTheme();
    setupEventListeners();
    updateChart();
    updateTable();
    updatePagination();
    populateLogTypeFilter();


    // Initialize date inputs with reasonable defaults
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);
    startDateInput.valueAsDate = oneWeekAgo;
    endDateInput.valueAsDate = today;

    // Set initial entries per page value
    entriesPerPage.value = logsPerPage;
}

// Set up theme from localStorage or preferred color scheme
function setupTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }
}

// Set up event listeners
function setupEventListeners() {
    themeToggle.addEventListener('click', toggleTheme);
    timeRangeSelect.addEventListener('change', function () {
        customRangeContainer.style.display = this.value === 'custom' ? 'flex' : 'none';
        filterLogsByTime();
    });
    chartTypeSelect.addEventListener('change', updateChart);
    exportChartBtn.addEventListener('click', exportChartAsPNG);
    searchLogs.addEventListener('input', handleSearch);
    prevPageBtn.addEventListener('click', goToPrevPage);
    nextPageBtn.addEventListener('click', goToNextPage);
    menuToggle.addEventListener('click', toggleSidebar);
    closeSidebar.addEventListener('click', toggleSidebar);
    resetColorsBtn.addEventListener('click', resetChartColors);
    closeModal.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    entriesPerPage.addEventListener('change', updateEntriesPerPage);
    logTypeFilter.addEventListener('change', filterLogsByType);
    applyCustomRangeBtn.addEventListener('click', applyCustomDateRange);
}

// Toggle between light and dark theme
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateChart(); // Update chart colors for better visibility
}

// Toggle sidebar visibility
function toggleSidebar() {
    sidebar.classList.toggle('open');
    document.body.classList.toggle('sidebar-open');

    if (sidebar.classList.contains('open')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.addEventListener('click', toggleSidebar);
        document.body.appendChild(overlay);
    } else {
        document.querySelector('.sidebar-overlay')?.remove();
    }
}

function generateRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 60%)`; // Using HSL for better color variety
}

// Function to get color for a type (with fallback)
function getColorForType(type) {
    // Return existing color if set
    if (currentColors[type]) return currentColors[type];

    // Return default color if exists
    if (DEFAULT_COLORS[type]) {
        currentColors[type] = DEFAULT_COLORS[type]; // Save to current colors
        return DEFAULT_COLORS[type];
    }

    // Generate and store a new random color
    const newColor = generateRandomColor();
    currentColors[type] = newColor;
    return newColor;
}

// Update the chart with current data and settings
function updateChart() {
    const ctx = document.getElementById('logChart').getContext('2d');
    const chartType = chartTypeSelect.value;

    // Get current theme colors
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color');
    const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color');
    const cardBg = getComputedStyle(document.documentElement).getPropertyValue('--card-bg');

    // Group logs by type for chart data
    const logTypes = [...new Set(logData.map(log => log.type))] ?? ['info', 'error', 'warning', 'success'];
    const logCounts = {};

    // Initialize counts
    logTypes.forEach(type => {
        logCounts[type] = 0;
    });

    // Count each log type in filtered logs
    filteredLogs.forEach(log => {
        if (Object.prototype.hasOwnProperty.call(logCounts, log.type)) {
            logCounts[log.type]++;
        }
    });

    // Prepare chart data with current colors
    const labels = logTypes.map(type =>
        `${type.charAt(0).toUpperCase() + type.slice(1)} (${logCounts[type]})`,
    );

    const data = logTypes.map(type => logCounts[type]);
    const backgroundColors = logTypes.map(type => getColorForType(type));

    // Animation configuration
    const animationConfig = {
        duration: 800,
        easing: 'easeOutQuart',
        animateScale: chartType === 'pie' || chartType === 'doughnut',
        animateRotate: chartType === 'pie' || chartType === 'doughnut',
    };

    // Destroy previous chart if exists
    if (logChart) {
        logChart.destroy();
    }

    // Create new chart with proper theming
    logChart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: 'Log Count by Type',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(color => shadeColor(color, -20)),
                borderWidth: 1,
                hoverBackgroundColor: backgroundColors.map(color => shadeColor(color, 10)),
                hoverBorderColor: backgroundColors.map(color => shadeColor(color, -30)),
                hoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: animationConfig,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: textColor,
                        font: {
                            size: 14,
                            weight: '500'
                        },
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        generateLabels: function (chart) {
                            return chart.data.labels.map((label, i) => ({
                                text: label,
                                fillStyle: chart.data.datasets[0].backgroundColor[i],
                                strokeStyle: chart.data.datasets[0].borderColor[i],
                                fontColor: textColor,
                                lineWidth: 1,
                                hidden: !chart.getDataVisibility(i),
                                index: i
                            }));
                        }
                    },
                    onClick: function (evt, legendItem, legend) {
                        const index = legendItem.index;
                        legend.chart.toggleDataVisibility(index);
                        legend.chart.update();
                    }
                },
                tooltip: {
                    backgroundColor: cardBg,
                    titleColor: textColor,
                    bodyColor: textColor,
                    borderColor: borderColor,
                    borderWidth: 1,
                    displayColors: true,
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            },
            scales: chartType === 'bar' || chartType === 'line' ? {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColor,
                        stepSize: 1,
                        precision: 0
                    },
                    grid: {
                        color: borderColor,
                        borderDash: [5, 5]
                    }
                },
                x: {
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: borderColor,
                        borderDash: [5, 5]
                    }
                }
            } : undefined,
            elements: {
                arc: {
                    borderWidth: chartType === 'pie' || chartType === 'doughnut' ? 1 : 0
                },
                bar: {
                    borderRadius: chartType === 'bar' ? 4 : 0
                }
            },
            cutout: chartType === 'doughnut' ? '60%' : undefined
        }
    });

    // Update color controls
    updateColorControls();
}

// Update color controls in sidebar
function updateColorControls() {
    colorControls.innerHTML = '';

    const fetchedTypes = new Set(logData.map(l => l.type)).values();
    const filteredTypes = Array.from(fetchedTypes);

    const types = filteredTypes.length > 0 ? filteredTypes : ['info', 'error', 'warning', 'success'];
    types.forEach(type => {
        const controlDiv = document.createElement('div');
        controlDiv.className = 'color-control';

        const label = document.createElement('label');
        label.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)}:`;
        label.htmlFor = `color-${type}`;
        label.style.color = getComputedStyle(document.documentElement).getPropertyValue('--text-color');

        const colorPreview = document.createElement('div');
        colorPreview.className = 'color-preview';
        colorPreview.style.backgroundColor = currentColors[type];

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.id = `color-${type}`;
        colorInput.value = currentColors[type];
        colorInput.addEventListener('input', (e) => {
            currentColors[type] = e.target.value;
            colorPreview.style.backgroundColor = e.target.value;
            updateChart();
        });

        controlDiv.appendChild(label);
        controlDiv.appendChild(colorPreview);
        controlDiv.appendChild(colorInput);
        colorControls.appendChild(controlDiv);
    });
}

// Reset chart colors to default
function resetChartColors() {
    currentColors = { ...DEFAULT_COLORS };
    updateChart();
}

// Export chart as PNG
function exportChartAsPNG() {
    const chartCanvas = document.getElementById('logChart');

    html2canvas(chartCanvas).then(canvas => {
        const link = document.createElement('a');
        link.download = 'log-chart.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

// Filter logs by selected time range
function filterLogsByTime() {
    const range = timeRangeSelect.value;
    const now = new Date();
    let startDate = new Date(), endDate = new Date();

    switch (range) {
        case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
        case 'yesterday':
            endDate = new Date(now.setHours(0, 0, 0, 0));
            startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 1);
            break;
        case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
        case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
        case 'custom':
            return; // Handled separately
        default:
            filteredLogs = [...logData];
            updateTable();
            updateChart();
            updatePagination();
            return;
    }

    filteredLogs = logData.filter(log => {
        return log.timeStamp >= startDate && log.timeStamp <= endDate;
    });

    currentPage = 1;
    updateTable();
    updateChart();
    updatePagination();
}

// Apply custom date range filter
function applyCustomDateRange() {
    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);

    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);

    if (startDate > endDate) {
        alert('Start date cannot be after end date');
        return;
    }

    filteredLogs = logData.filter(log => {
        return log.timeStamp >= startDate && log.timeStamp <= endDate;
    });

    currentPage = 1;
    updateTable();
    updateChart();
    updatePagination();
}

// Filter logs by selected type
function filterLogsByType() {
    const selectedType = logTypeFilter.value;

    if (selectedType === 'all') {
        filteredLogs = [...logData];
    } else {
        filteredLogs = logData.filter(log => log.type === selectedType);
    }

    currentPage = 1;
    updateTable();
    updateChart();
    updatePagination();
}

// Populate log type filter options
function populateLogTypeFilter() {
    // Get unique log types from data
    const types = [...new Set(logData.map(log => log.type))];

    // Clear existing options except "All Types"
    logTypeFilter.innerHTML = '<option value="all">All Types</option>';

    // Add new options
    types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        logTypeFilter.appendChild(option);
    });
}

// Update entries per page
function updateEntriesPerPage() {
    logsPerPage = parseInt(entriesPerPage.value);
    localStorage.setItem('logsPerPage', logsPerPage);
    currentPage = 1;
    updateTable();
    updatePagination();
}

// Update the log table with paginated data
function updateTable() {
    logTable.innerHTML = '';

    const startIndex = (currentPage - 1) * logsPerPage;
    const endIndex = startIndex + logsPerPage;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    if (paginatedLogs.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6" style="text-align: center;">No logs found</td>';
        logTable.appendChild(row);
        return;
    }

    paginatedLogs.forEach(log => {
        const row = document.createElement('tr');
        row.className = 'fade-in';

        row.innerHTML = `
            <td>${log.id}</td>
            <td><span class="badge badge-${log.type}">${log.type}</span></td>
            <td>${log.action}</td>
            <td>${log?.message?.length > 50 ? `${log?.message.substring(0, 50)}...` : log.message}</td>
            <td>${formatDate(new Date(log.timeStamp))}</td>
            <td><button class="btn view-details" data-id="${log.id}"><i class="fas fa-eye"></i> View</button></td>
        `;

        logTable.appendChild(row);
    });

    // Add event listeners to detail buttons
    document.querySelectorAll('.view-details').forEach(btn => {
        btn.addEventListener('click', function () {
            const logId = parseInt(this.getAttribute('data-id'));
            const log = logData.find(l => l.id === logId);
            showLogDetails(log);
        });
    });
}

// Show log details in modal
function showLogDetails(log) {
    modalBody.innerHTML = '';

    const details = [
        { label: 'ID', value: log.id },
        { label: 'Type', value: log.type },
        { label: 'Action', value: log.action },
        { label: 'Message', value: log.message },
        { label: 'Timestamp', value: formatDate(new Date(log.timeStamp), true) },
        { label: 'Meta', value: JSON.stringify(log, null, 4) },
    ];

    details.forEach(detail => {
        const detailDiv = document.createElement('div');
        detailDiv.className = 'log-detail slide-up';

        const labelEl = document.createElement('label');
        labelEl.textContent = detail.label + ':';
        detailDiv.appendChild(labelEl);

        const wrapperSpan = document.createElement('span');
        if (detail.label === 'Type') {
            const badgeSpan = document.createElement('span');
            badgeSpan.className = 'badge badge-' + detail.value;
            badgeSpan.textContent = detail.value;
            wrapperSpan.appendChild(badgeSpan);
        } else if (detail.label === 'Meta') {
            const preEl = document.createElement('pre');
            preEl.textContent = detail.value;
            wrapperSpan.appendChild(preEl);
        } else {
            wrapperSpan.textContent = detail.value;
        }
        detailDiv.appendChild(wrapperSpan);

        modalBody.appendChild(detailDiv);
    });

    modal.style.display = 'block';

}

// Update pagination controls
function updatePagination() {
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

    // Update pagination info
    const startEntry = ((currentPage - 1) * logsPerPage) + 1;
    const endEntry = Math.min(currentPage * logsPerPage, filteredLogs.length);
    paginationInfo.textContent = `Showing ${startEntry} to ${endEntry} of ${filteredLogs.length} entries`;

    // Update previous/next buttons
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;

    // Update page numbers
    pageNumbers.innerHTML = '';

    if (totalPages <= 1) return;

    // Always show first page
    addPageNumber(1);

    // Show ellipsis if needed
    if (currentPage > 3) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        pageNumbers.appendChild(ellipsis);
    }

    // Show current page and adjacent pages
    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    for (let i = startPage; i <= endPage; i++) {
        addPageNumber(i);
    }

    // Show ellipsis if needed
    if (currentPage < totalPages - 2) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        pageNumbers.appendChild(ellipsis);
    }

    // Always show last page if different from first
    if (totalPages > 1) {
        addPageNumber(totalPages);
    }
}

// Helper to add a page number button
function addPageNumber(page) {
    const pageBtn = document.createElement('span');
    pageBtn.className = `page-number ${page === currentPage ? 'active' : ''}`;
    pageBtn.textContent = page;
    pageBtn.addEventListener('click', () => goToPage(page));
    pageNumbers.appendChild(pageBtn);
}

// Navigate to specific page
function goToPage(page) {
    currentPage = page;
    updateTable();
    updatePagination();

    // Smooth scroll to top of table
    document.querySelector('.log-table-section').scrollIntoView({
        behavior: 'smooth'
    });
}

// Go to previous page
function goToPrevPage() {
    if (currentPage > 1) {
        goToPage(currentPage - 1);
    }
}

// Go to next page
function goToNextPage() {
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
    if (currentPage < totalPages) {
        goToPage(currentPage + 1);
    }
}

// Handle search input
function handleSearch() {
    const searchTerm = searchLogs.value.toLowerCase();

    if (searchTerm === '') {
        filteredLogs = [...logData];
    } else {
        filteredLogs = logData.filter(log => {
            return (
                log.id.toString().includes(searchTerm) ||
                log.type.toLowerCase().includes(searchTerm) ||
                log.action.toLowerCase().includes(searchTerm) ||
                log.message.toLowerCase().includes(searchTerm) ||
                log.timeStamp.toISOString().toLowerCase().includes(searchTerm)
            );
        });
    }

    currentPage = 1;
    updateTable();
    updatePagination();
}

// Helper to format date
function formatDate(date, full = false) {
    const options = full ? {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    } : {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    return date?.toLocaleDateString(undefined, options);
}

// Helper to shade a color
function shadeColor(color, percent) {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    const RR = R.toString(16).padStart(2, '0');
    const GG = G.toString(16).padStart(2, '0');
    const BB = B.toString(16).padStart(2, '0');

    return `#${RR}${GG}${BB}`;
}

// Make chart responsive to window resize
window.addEventListener('resize', function () {
    if (logChart) {
        logChart.resize();
    }
});