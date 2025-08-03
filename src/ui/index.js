// Theme Toggle with localStorage persistence
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const themeIcon = themeToggle.querySelector('i');
// Apply saved theme on page load
const savedTheme = localStorage.getItem('theme') || 'light';
body.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);
function updateThemeIcon(theme) {
    if (theme === 'dark') {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    } else {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    }
}
themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme); // Save to localStorage
    updateThemeIcon(newTheme);
    updateChart();
});
// Tab Navigation
const tabs = document.querySelectorAll('.tab');
const dashboardContent = document.getElementById('dashboard-content');
const settingsContainer = document.getElementById('settings-container');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (tab.getAttribute('data-tab') === 'dashboard') {
            dashboardContent.style.display = 'block';
            settingsContainer.classList.remove('active');
        } else if (tab.getAttribute('data-tab') === 'settings') {
            dashboardContent.style.display = 'none';
            settingsContainer.classList.add('active');
        }
    });
});
// Logout Button
const logoutBtn = document.getElementById('logout-btn');
logoutBtn.addEventListener('click', async () => {
    // Remove cookies
    showNotification('Logging out', 'info');
    await fetch("/logout");
    setTimeout(async () => {
        // Redirect to login page
        showNotification('You have been logged out successfully', 'success');
        window.location.href = '/auth-ui'; // Replace with actual login page URL
    }, 1500);
});
// Custom Date Container
const filterSelect = document.getElementById('filter-select');
const customDateContainer = document.getElementById('custom-date-container');
filterSelect.addEventListener('change', () => {
    if (filterSelect.value === 'custom') {
        customDateContainer.classList.add('active');
    } else {
        customDateContainer.classList.remove('active');
    }
    filterLogs();
});
// Generate 24-hour labels for the chart
function generate24HourLabels() {
    const labels = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
        const hour = new Date(now);
        hour.setHours(now.getHours() - i);
        labels.push(hour.getHours() + ':00');
    }
    return labels;
}
// Generate chart data based on filtered logs
function generateChartData(logs) {
    // Initialize with all possible types from sample data
    const data = {
        authentication: new Array(24).fill(0),
        system: new Array(24).fill(0),
        api: new Array(24).fill(0),
        database: new Array(24).fill(0),
        security: new Array(24).fill(0)
    };

    // Add any new types from the logs that aren't in our initial data
    logs.forEach(log => {
        if (!data[log.type]) {
            data[log.type] = new Array(24).fill(0);
        }
    });

    // Count logs by hour and type
    logs.forEach(log => {
        const timeStamp = new Date(log.timeStamp);
        const hour = timeStamp.getHours();
        if (data[log.type]) {
            data[log.type][hour]++;
        }
    });

    return data;
}
// Chart Setup
const ctx = document.getElementById('response-chart');
let chartType = 'bar';
let chart;
function createChart(type, logs) {
    // Destroy existing chart if it exists
    if (chart) {
        chart.destroy();
        chart = null;
    }

    // Ensure canvas context is available
    if (!ctx) {
        console.error('Canvas context not found');
        return;
    }

    const isDarkMode = body.getAttribute('data-theme') === 'dark';
    const textColor = isDarkMode ? '#f0f0f0' : '#333333';
    const gridColor = isDarkMode ? '#404040' : '#dddddd';
    const hourData = generateChartData(logs);

    // Define color palette for different log types
    const colorPalette = [
        'rgba(156, 39, 176, 0.6)', // purple
        'rgba(3, 169, 244, 0.6)',   // blue
        'rgba(255, 152, 0, 0.6)',   // orange
        'rgba(76, 175, 80, 0.6)',   // green
        'rgba(244, 67, 54, 0.6)',   // red
        'rgba(0, 188, 212, 0.6)',   // cyan
        'rgba(255, 235, 59, 0.6)',  // yellow
        'rgba(121, 85, 72, 0.6)',   // brown
        'rgba(158, 158, 158, 0.6)', // grey
        'rgba(233, 30, 99, 0.6)'    // pink
    ];

    // Create datasets dynamically based on available log types
    const datasets = [];
    let colorIndex = 0;

    // Get all unique log types
    const uniqueTypes = [...new Set(logs.map(log => log.type))];

    // If no logs, create a placeholder dataset
    if (uniqueTypes.length === 0) {
        datasets.push({
            label: 'No Data',
            data: new Array(24).fill(0),
            backgroundColor: 'rgba(200, 200, 200, 0.2)',
            borderColor: 'rgba(200, 200, 200, 1)',
            borderWidth: 1
        });
    } else {
        // Filter by selected type if not "all"
        const selectedType = document.getElementById('type-filter').value;
        const typesToShow = selectedType === 'all' ? uniqueTypes : [selectedType];

        typesToShow.forEach(type => {
            const color = colorPalette[colorIndex % colorPalette.length];
            datasets.push({
                label: type.charAt(0).toUpperCase() + type.slice(1),
                data: hourData[type] || new Array(24).fill(0),
                backgroundColor: color,
                borderColor: color.replace('0.6', '1'),
                borderWidth: 1
            });
            colorIndex++;
        });
    }

    // Calculate max value for y-axis
    let maxValue = 0;
    datasets.forEach(dataset => {
        const datasetMax = Math.max(...dataset.data);
        if (datasetMax > maxValue) {
            maxValue = datasetMax;
        }
    });

    // Add padding to max value (at least 1 if max is 0)
    maxValue = maxValue === 0 ? 1 : Math.ceil(maxValue * 1.1);

    console.log('Creating chart with datasets:', datasets);
    console.log('Logs data:', logs);

    try {
        chart = new Chart(ctx, {
            type: type,
            data: {
                labels: generate24HourLabels(),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: maxValue,
                        title: {
                            display: true,
                            text: 'Log Count',
                            color: textColor
                        },
                        ticks: {
                            color: textColor,
                            stepSize: 1 // Ensure integer steps
                        },
                        grid: {
                            color: gridColor
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Time (24 Hours)',
                            color: textColor
                        },
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            color: gridColor
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: textColor
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
        console.log('Chart created successfully');
    } catch (error) {
        console.error('Error creating chart:', error);
    }
}
function updateChart() {
    createChart(chartType, filteredLogs);
}
// Chart Type Toggle
const chartTypeBtns = document.querySelectorAll('.chart-type-btn');
chartTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        chartTypeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        chartType = btn.getAttribute('data-chart-type');
        updateChart();
    });
});
// API Configuration
const API_ENDPOINT = '/audit-log'; // Replace with your actual API endpoint
// State variables
let logs = []; // Start with empty data
let filteredLogs = []; // Initially empty
let isInitialLoad = true; // Track if this is the initial page load
// Pagination variables
let currentPage = 1;
let itemsPerPage = 10;
// Refresh interval variables
let refreshIntervalId = null;
let refreshInterval = 30; // Default refresh interval in seconds
// Notification settings
let showFetchNotifications = true; // Default to show notifications
// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('dashboardSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);

        // Apply items per page setting
        itemsPerPage = settings.itemsPerPage || 10;
        document.getElementById('items-per-page').value = itemsPerPage;

        // Apply refresh interval setting
        refreshInterval = settings.refreshInterval || 30;
        document.getElementById('refresh-interval').value = refreshInterval;

        // Apply notification setting
        showFetchNotifications = settings.showFetchNotifications !== undefined ? settings.showFetchNotifications : true;
        document.getElementById('show-fetch-notifications').checked = showFetchNotifications;
    }
}
// Save settings to localStorage
function saveSettings() {
    const settings = {
        itemsPerPage: parseInt(document.getElementById('items-per-page').value),
        refreshInterval: parseInt(document.getElementById('refresh-interval').value),
        showFetchNotifications: document.getElementById('show-fetch-notifications').checked
    };

    localStorage.setItem('dashboardSettings', JSON.stringify(settings));

    // Apply settings
    itemsPerPage = settings.itemsPerPage;
    refreshInterval = settings.refreshInterval;
    showFetchNotifications = settings.showFetchNotifications;

    // Reset to first page when items per page changes
    currentPage = 1;
    renderLogs();

    // Set up the refresh interval
    setupRefreshInterval();

    showNotification('Settings saved successfully!', 'success');
}

function generateLogTypeCounts(logs) {
    const counts = {};

    logs.forEach(log => {
        if (counts[log.type]) {
            counts[log.type]++;
        } else {
            counts[log.type] = 1;
        }
    });

    return counts;
}

// Render log type cards in the carousel
function renderLogTypeCards(logs) {
    const carousel = document.getElementById('log-types-carousel');
    carousel.innerHTML = '';

    const typeCounts = generateLogTypeCounts(logs);

    // Define color palette for different log types
    const colorPalette = [
        'rgba(156, 39, 176, 1)', // purple
        'rgba(3, 169, 244, 1)',   // blue
        'rgba(255, 152, 0, 1)',   // orange
        'rgba(76, 175, 80, 1)',   // green
        'rgba(244, 67, 54, 1)',   // red
        'rgba(0, 188, 212, 1)',   // cyan
        'rgba(255, 235, 59, 1)',  // yellow
        'rgba(121, 85, 72, 1)',   // brown
        'rgba(158, 158, 158, 1)', // grey
        'rgba(233, 30, 99, 1)'    // pink
    ];

    let colorIndex = 0;

    // Create a card for each log type
    for (const [type, count] of Object.entries(typeCounts)) {
        const card = document.createElement('div');
        card.className = 'log-type-card';

        // Set the card color based on the type
        const color = colorPalette[colorIndex % colorPalette.length];
        card.style.borderTop = `4px solid ${color}`;

        card.innerHTML = `
            <div class="type-name">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="type-count">${count}</div>
        `;

        // Add click event to filter by this type
        card.addEventListener('click', () => {
            document.getElementById('type-filter').value = type;
            filterLogs();
        });

        carousel.appendChild(card);
        colorIndex++;
    }

    // If no logs, show a message
    if (Object.keys(typeCounts).length === 0) {
        const noDataCard = document.createElement('div');
        noDataCard.className = 'log-type-card';
        noDataCard.innerHTML = `
            <div class="type-name">No Logs</div>
            <div class="type-count">0</div>
        `;
        carousel.appendChild(noDataCard);
    }
}

// Populate type filter dropdown
function populateTypeFilter(logs) {
    const typeFilter = document.getElementById('type-filter');
    const currentValue = typeFilter.value;

    // Get unique types from logs
    const uniqueTypes = [...new Set(logs.map(log => log.type))];

    // Clear existing options except the first one (All Types)
    while (typeFilter.options.length > 1) {
        typeFilter.remove(1);
    }

    // Add options for each unique type
    uniqueTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        typeFilter.appendChild(option);
    });

    // Try to restore the previous selection if it still exists, otherwise set to 'all'
    if (currentValue !== 'all' && uniqueTypes.includes(currentValue)) {
        typeFilter.value = currentValue;
    } else {
        typeFilter.value = 'all';
    }
}
// Fetch logs from API
async function fetchLogsFromAPI() {
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.classList.add('active');

    try {
        const response = await fetch(API_ENDPOINT);
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        const data = await response.json();

        // Show notification if enabled
        if (showFetchNotifications) {
            showNotification('Logs fetched successfully', 'success');
        }

        return data.logs;
    } catch (error) {
        console.error('Error fetching logs from API:', error);

        // Show notification if enabled
        if (showFetchNotifications) {
            showNotification('Failed to fetch logs', 'error');
        }

        return null; // Return null to indicate error
    } finally {
        loadingIndicator.classList.remove('active');
    }
}
// Show notification
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            notification.style.display = 'none';
            notification.classList.remove('fade-out');
        }, 500);
    }, 3000);
}
// Load logs (from API)
// Load logs (from API)
async function loadLogs() {
    // Fetch from API
    const apiLogs = await fetchLogsFromAPI();

    if (apiLogs && apiLogs.length > 0) {
        // Check if we have existing logs
        if (logs.length > 0 && !isInitialLoad) {
            // Find new logs by comparing IDs
            const existingLogIds = new Set(logs.map(log => log.id));
            const newLogs = apiLogs.filter(log => !existingLogIds.has(log.id));

            if (newLogs.length > 0) {
                // Add new logs at the beginning of the array
                logs = [...newLogs, ...logs];

                // Show notification about new logs
                if (showFetchNotifications) {
                    showNotification(`${newLogs.length} new logs added`, 'success');
                }

                // Reset to first page to show new logs
                currentPage = 1;
            } else {
                // No new logs
                if (showFetchNotifications) {
                    showNotification('No new logs found', 'info');
                }
            }
        } else {
            // Initial load or no existing logs
            logs = apiLogs;

            // After initial load, set flag to false
            if (isInitialLoad) {
                isInitialLoad = false;
            }
        }
    } else {
        // If API returns empty or error, keep logs as they are
        if (isInitialLoad) {
            logs = [];
            isInitialLoad = false;
        }
    }

    // Populate the type filter with the current logs
    populateTypeFilter(logs);

    // Render log type cards
    renderLogTypeCards(logs);

    // Apply current filters
    filterLogs();
}

// Initialize the application
async function initializeApp() {
    // Load settings from localStorage
    loadSettings();

    // Set default filter to "all" to ensure logs are displayed initially
    document.getElementById('filter-select').value = 'today';

    // Show loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.classList.add('active');

    // Load initial logs from API
    await loadLogs();

    // Set up refresh interval
    setupRefreshInterval();

    filterSelect.dispatchEvent(new Event('change'));

    // Render initial UI
    renderLogs();

    // Create chart with a small delay to ensure DOM is ready
    setTimeout(() => {
        createChart(chartType, filteredLogs);
    }, 100);
}
// Render Log Table with pagination
function renderLogs() {
    const logTableBody = document.getElementById('log-table-body');
    logTableBody.innerHTML = '';

    // If no logs, show a message
    if (filteredLogs.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" class="no-logs-message">No logs found</td>
        `;
        logTableBody.appendChild(row);

        // Render empty pagination
        renderPagination();
        return;
    }

    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
    paginatedLogs.forEach(log => {
        const row = document.createElement('tr');
        const typeClass = `type-${log.type}`;
        row.innerHTML = `
            <td>${log.id}</td>
            <td><span class="log-type ${typeClass}">${log.type.charAt(0).toUpperCase() + log.type.slice(1)}</span></td>
            <td>${log.action}</td>
            <td>${log.message}</td>
            <td>${log.timeStamp}</td>
            <td>
                <button class="action-btn" title="View Details" data-log-id="${log.id}">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        `;
        logTableBody.appendChild(row);
    });
    // Render pagination controls
    renderPagination();
    // Add event listeners to detail buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const logId = this.getAttribute('data-log-id');
            showLogDetails(logId);
        });
    });
}
// Render pagination controls
function renderPagination() {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

    // If no logs, don't show pagination
    if (filteredLogs.length === 0) {
        return;
    }

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderLogs();
        }
    });
    pagination.appendChild(prevBtn);
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            renderLogs();
        });
        pagination.appendChild(pageBtn);
    }
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderLogs();
        }
    });
    pagination.appendChild(nextBtn);
    // Page info
    const pageInfo = document.createElement('div');
    pageInfo.className = 'pagination-info';
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredLogs.length);
    pageInfo.textContent = `Showing ${startItem}-${endItem} of ${filteredLogs.length} items`;
    pagination.appendChild(pageInfo);
}
// Show log details in modal
function showLogDetails(logId) {
    const log = logs.find(l => l.id === logId);
    if (!log) return;
    const modal = document.getElementById('log-details-modal');
    const content = document.getElementById('log-details-content');

    // Format details as a list instead of raw JSON
    let detailsHtml = '<ul class="detail-list">';
    for (const [key, value] of Object.entries(log.details ?? log)) {
        detailsHtml += `<li><strong>${key}:</strong> ${value}</li>`;
    }
    detailsHtml += '</ul>';

    content.innerHTML = `
        <div class="detail-row">
            <div class="detail-label">ID:</div>
            <div class="detail-value">${log.id}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Type:</div>
            <div class="detail-value">${log.type.charAt(0).toUpperCase() + log.type.slice(1)}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Action:</div>
            <div class="detail-value">${log.action}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Message:</div>
            <div class="detail-value">${log.message}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">timeStamp:</div>
            <div class="detail-value">${log.timeStamp}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Details:</div>
            <div class="detail-value">${detailsHtml}</div>
        </div>
    `;
    modal.classList.add('active');
}
// Close modal
const closeModal = document.getElementById('close-modal');
const modal = document.getElementById('log-details-modal');
closeModal.addEventListener('click', () => {
    modal.classList.remove('active');
});
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
    }
});
// Search functionality
const searchInput = document.getElementById('search-input');
searchInput.addEventListener('input', () => {
    filterLogs();
});
// Type filter functionality
const typeFilter = document.getElementById('type-filter');
typeFilter.addEventListener('change', () => {
    filterLogs();
});
// Filter functionality
function filterLogs() {
    const filterValue = filterSelect.value;
    let tempFilteredLogs = [...logs]; // Start with all logs

    console.log('Filtering logs with filter value:', filterValue);
    console.log('Total logs before filtering:', tempFilteredLogs.length);

    // Apply actual date filtering
    const now = new Date();
    let startDate, endDate;

    if (filterValue === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    } else if (filterValue === 'yesterday') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (filterValue === 'this-week') {
        const dayOfWeek = now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 7);
    } else if (filterValue === 'this-month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else if (filterValue === 'custom') {
        startDate = new Date(document.getElementById('start-date').value);
        endDate = new Date(document.getElementById('end-date').value);
        endDate.setDate(endDate.getDate() + 1); // Include end date
    }

    if (filterValue !== 'all') {
        tempFilteredLogs = tempFilteredLogs.filter(log => {
            const logDate = new Date(log.timeStamp);
            return logDate >= startDate && logDate < endDate;
        });
        console.log('Logs after date filtering:', tempFilteredLogs.length);
    }

    // Apply type filter if set
    const selectedType = typeFilter.value;
    if (selectedType !== 'all') {
        tempFilteredLogs = tempFilteredLogs.filter(log => log.type === selectedType);
        console.log('Logs after type filtering:', tempFilteredLogs.length);
    }

    // Apply search filter if set
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        tempFilteredLogs = tempFilteredLogs.filter(log =>
            log.id.toLowerCase().includes(searchTerm) ||
            log.message.toLowerCase().includes(searchTerm) ||
            log.type.toLowerCase().includes(searchTerm) ||
            log.action.toLowerCase().includes(searchTerm)
        );
        console.log('Logs after search filtering:', tempFilteredLogs.length);
    }

    filteredLogs = tempFilteredLogs;
    currentPage = 1;
    renderLogs();
    updateChart();


    // Update log type cards based on filtered logs
    // renderLogTypeCards(filteredLogs);
}
// Set today's date as default for date pickers
const today = new Date().toISOString().split('T')[0];
document.getElementById('start-date').value = today;
document.getElementById('end-date').value = today;
// Add event listeners to date pickers
document.getElementById('start-date').addEventListener('change', filterLogs);
document.getElementById('end-date').addEventListener('change', filterLogs);
// Settings Save
const saveSettingsBtn = document.getElementById('save-settings');
saveSettingsBtn.addEventListener('click', () => {
    saveSettings();
});
// Refresh functionality
function setupRefreshInterval() {
    // Clear any existing interval
    if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
    }
    // Set up new interval if valid
    if (refreshInterval > 0) {
        refreshIntervalId = setInterval(async () => {
            console.log('Refreshing logs from API...');
            await loadLogs(); // This will fetch from API and update UI
        }, refreshInterval * 1000);
    }
}
// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);