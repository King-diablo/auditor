// Refactored and improved JavaScript for Audit Log Dashboard

const DEFAULT_COLORS = {
    info: '#2196F3',
    error: '#F44336',
    warning: '#FF9800',
    success: '#4CAF50',
    signal: '#9C27B0',
    system: '#607D8B',
    request: '#FF5722',
};

let currentColors = { ...DEFAULT_COLORS };
let logsPerPage = parseInt(localStorage.getItem('logsPerPage'), 10) || 10;
let currentPage = 1;
let filteredLogs = [];
let logData = [];
let logChart;

const DOM = {
    themeToggle: document.getElementById('themeToggleCheckbox'),
    timeRange: document.getElementById('timeRange'),
    chartType: document.getElementById('chartType'),
    exportChart: document.getElementById('exportChart'),
    logTable: document.getElementById('logTable').querySelector('tbody'),
    search: document.getElementById('searchLogs'),
    prevPage: document.getElementById('prevPage'),
    nextPage: document.getElementById('nextPage'),
    pageNumbers: document.getElementById('pageNumbers'),
    paginationInfo: document.getElementById('paginationInfo'),
    closeSidebar: document.getElementById('closeSidebar'),
    colorControls: document.getElementById('colorSettingsPanel'),
    modal: document.getElementById('logModal'),
    modalBody: document.getElementById('modalBody'),
    closeModal: document.querySelector('.close-modal'),
    entriesPerPage: document.getElementById('entriesPerPage'),
    logTypeFilter: document.getElementById('logTypeFilter'),
    startDate: document.getElementById('startDate'),
    endDate: document.getElementById('endDate'),
    applyCustomRange: document.getElementById('applyCustomRange'),
    customRangeContainer: document.getElementById('customRangeContainer')
};

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}


function generateColor() {
    const h = Math.floor(Math.random() * 360);
    return `hsl(${h}, 70%, 60%)`;
}

function getColor(type) {
    if (!currentColors[type]) currentColors[type] = generateColor();
    return currentColors[type];
}

function shadeColor(color, percent) {
    const num = parseInt(color.slice(1), 16);
    let R = (num >> 16) + percent;
    let G = ((num >> 8) & 0x00FF) + percent;
    let B = (num & 0x0000FF) + percent;
    return `#${(1 << 24 | Math.min(255, R) << 16 | Math.min(255, G) << 8 | Math.min(255, B)).toString(16).slice(1)}`;
}

function formatDate(date, full = false) {
    const opt = full ? {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    } : {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    };
    return new Date(date).toLocaleDateString(undefined, opt);
}

function toggleTheme() {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateChart();
}

function initTheme() {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));
    if (!saved) localStorage.setItem('theme', prefersDark ? 'dark' : 'light');
}

function applyDateFilter() {
    const now = new Date();
    const range = DOM.timeRange.value;
    let start, end;

    switch (range) {
        case 'today':
            start = new Date(now.setHours(0, 0, 0, 0));
            end = new Date();
            break;
        case 'yesterday':
            start = new Date(now.setDate(now.getDate() - 1));
            start.setHours(0, 0, 0, 0);
            end = new Date(now.setHours(23, 59, 59, 999));
            break;
        case 'week':
            start = new Date(now);
            start.setDate(start.getDate() - start.getDay());
            start.setHours(0, 0, 0, 0);
            end = new Date();
            break;
        case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date();
            break;
        case 'custom':
            const s = new Date(DOM.startDate.value);
            const e = new Date(DOM.endDate.value);
            if (!isNaN(s) && !isNaN(e)) {
                start = s;
                end = new Date(e.setHours(23, 59, 59, 999));
            } else return;
            break;
        default:
            filteredLogs = [...logData];
            return;
    }
    filteredLogs = logData.filter(log => new Date(log.timeStamp) >= start && new Date(log.timeStamp) <= end);
    updateChart();
    updateTable();
    updatePagination();
}

function updateChart() {
    const ctx = document.getElementById('logChart').getContext('2d');
    const chartType = DOM.chartType.value;

    // Get theme vars
    const theme = getComputedStyle(document.documentElement);
    const textColor = theme.getPropertyValue('--text-color').trim();
    const borderColor = theme.getPropertyValue('--border-color').trim();
    const cardBg = theme.getPropertyValue('--card-bg').trim();

    // Clean chart if exists
    if (logChart) logChart.destroy();

    const types = [...new Set(filteredLogs.map(log => log.type))]; // ✅ Define this before use

    const grouped = {};

    filteredLogs.forEach(log => {
        const date = new Date(log.timeStamp);
        const hour = `${date.getHours().toString().padStart(2, '0')}:00`; // "14:00"
        if (!grouped[hour]) grouped[hour] = {};
        if (!grouped[hour][log.type]) grouped[hour][log.type] = 0;
        grouped[hour][log.type]++;
    });

    const allHours = Array.from({ length: 24 }, (_, h) => `${h.toString().padStart(2, '0')}:00`);
    const logTypes = [...new Set(filteredLogs.map(log => log.type))];

    // Prepare datasets
    const datasets = logTypes.map(type => {
        return {
            label: capitalize(type),
            data: allHours.map(hour => grouped[hour]?.[type] || 0),
            backgroundColor: getColor(type),
            borderColor: shadeColor(getColor(type), -20),
            fill: chartType !== 'line',
            tension: 0.4,
            borderWidth: 2,
            pointBackgroundColor: getColor(type),
            pointBorderColor: borderColor,
        };
    });

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: textColor,
                    usePointStyle: true,
                    boxWidth: 12,
                    padding: 15
                }
            },
            tooltip: {
                backgroundColor: cardBg,
                titleColor: textColor,
                bodyColor: textColor,
                borderColor: borderColor,
                borderWidth: 1
            }
        },
        scales: chartType === 'pie' || chartType === 'doughnut' ? {} : {
            x: {
                ticks: { color: textColor },
                grid: { color: borderColor },
                title: {
                    display: true,
                    text: 'Time',
                    color: textColor
                }
            },
            y: {
                beginAtZero: true,
                ticks: { color: textColor },
                grid: { color: borderColor },
                title: {
                    display: true,
                    text: 'Log Count',
                    color: textColor
                }
            }
        }
    };

    if (chartType === 'pie' || chartType === 'doughnut') {
        const countByType = {};
        filteredLogs.forEach(log => {
            countByType[log.type] = (countByType[log.type] || 0) + 1;
        });

        const labels = Object.keys(countByType);
        const data = Object.values(countByType);
        const colors = labels.map(getColor);

        logChart = new Chart(ctx, {
            type: chartType,
            data: {
                labels: labels.map(capitalize),
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderColor: colors.map(c => shadeColor(c, -20)),
                    borderWidth: 1
                }]
            },
            options
        });
    } else {
        logChart = new Chart(ctx, {
            type: chartType,
            data: {
                labels: allHours,
                datasets
            },
            options
        });
    }
}


function getContrastYIQ(hexcolor) {
    hexcolor = hexcolor.replace('#', '');
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? '#000000' : '#ffffff';
}


function updateLogTableColors() {
    document.querySelectorAll('#logTable .badge').forEach(badge => {
        const type = badge.textContent.trim().toLowerCase();
        const bgColor = currentColors[type] || getColor(type);
        badge.style.backgroundColor = bgColor;
        badge.style.color = getContrastYIQ(bgColor);
    });
}  


function updateColorControls(types) {
    DOM.colorControls.innerHTML = '';
    types.forEach(type => {
        const wrapper = document.createElement('div');
        wrapper.className = 'color-control';
        wrapper.innerHTML = `
            <label for="color-${type}" style="color: var(--text-color); text-transform: capitalize;">
                ${type}
            </label>
            <div class="color-preview" style="background:${getColor(type)}"></div>
            <input type="color" id="color-${type}" value="${getColor(type)}">
        `;
        const colorInput = wrapper.querySelector('input');
        colorInput.addEventListener('input', e => {
            currentColors[type] = e.target.value;
            updateChart();
            updateTable(); // 👈 Updates the badge colors
        });

        wrapper.querySelector('input').addEventListener('change', e => {
            e.stopPropagation(); // ✅ Prevents dropdown from closing or parent actions
            currentColors[type] = e.target.value;
            localStorage.setItem('customColors', JSON.stringify(currentColors));
            updateChart();
            updateLogTableColors();

        });

        DOM.colorControls.appendChild(wrapper);
    });
}


function updateTable() {
    DOM.logTable.innerHTML = '';
    const start = (currentPage - 1) * logsPerPage;
    const pageLogs = filteredLogs.slice(start, start + logsPerPage);
    if (!pageLogs.length) {
        DOM.logTable.innerHTML = '<tr><td colspan="6" style="text-align:center;">No logs found</td></tr>';
        return;
    }
    pageLogs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
        <td>${log.id}</td>
        <td><span class="badge" style="background-color: ${getColor(log.type)}; color: #fff;">
        ${log.type.charAt(0).toUpperCase() + log.type.slice(1)}</span></td>
        <td>${capitalize(log.action)}</td>
        <td>${log?.message?.slice(0, 50)}${log?.message?.length > 50 ? '...' : ''}</td>
        <td>${formatDate(log.timeStamp)}</td>
        <td><button class="btn view-details" data-id="${log.id}"><i class="fas fa-eye"></i> View</button></td>
      `;
        DOM.logTable.appendChild(row);
    });
    document.querySelectorAll('.view-details').forEach(btn => btn.addEventListener('click', showDetails));
    updateLogTableColors();
}

function updatePagination() {
    const total = Math.ceil(filteredLogs.length / logsPerPage);
    const start = (currentPage - 1) * logsPerPage + 1;
    const end = Math.min(currentPage * logsPerPage, filteredLogs.length);
    DOM.paginationInfo.textContent = `Showing ${start}-${end} of ${filteredLogs.length}`;
    DOM.prevPage.disabled = currentPage === 1;
    DOM.nextPage.disabled = currentPage === total;
    DOM.pageNumbers.innerHTML = '';

    const maxPages = 7;
    let pages = [];
    if (total <= maxPages) {
        pages = Array.from({ length: total }, (_, i) => i + 1);
    } else {
        pages = [1];
        if (currentPage > 3) pages.push('...');
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(total - 1, currentPage + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (currentPage < total - 2) pages.push('...');
        pages.push(total);
    }

    pages.forEach(p => {
        const span = document.createElement('span');
        span.className = `page-number ${p === currentPage ? 'active' : ''}`;
        span.textContent = p;
        if (p !== '...') span.addEventListener('click', () => goToPage(p));
        DOM.pageNumbers.appendChild(span);
    });
}

function goToPage(p) {
    currentPage = p;
    updateTable();
    updatePagination();
}

function showDetails(e) {
    const id = e.currentTarget.dataset.id;
    const log = logData.find(l => l.id.toString() === id.toString());

    DOM.modalBody.innerHTML = `
      <div class="log-details-grid">
        ${Object.entries(log).map(([key, value]) => `
          <div class="log-detail-item">
            <div class="log-detail-key">${formatKey(key)}</div>
            <div class="log-detail-value">${formatValue(value)}</div>
          </div>
        `).join('')}
      </div>
    `;

    DOM.modal.style.display = 'block';
}

function formatKey(key) {
    // Format camelCase or snake_case keys to Title Case
    return key
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, l => l.toUpperCase());
}

function formatValue(value) {
    if (typeof value === 'object') {
        return `<pre>${JSON.stringify(value, null, 2)}</pre>`;
    }
    return String(value);
}


async function getAuditLogs() {
    try {
        const res = await fetch('/audit-log');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return data.logs;
    } catch {
        return [
            { id: 1, type: 'info', action: 'login', message: 'User logged in', timeStamp: new Date(), details: { userId: 1 } },
            { id: 2, type: 'error', action: 'api_call', message: 'API failure', timeStamp: new Date(), details: { endpoint: '/api' } },
        ];
    }
}

async function initDashboard() {
    const stored = localStorage.getItem('customColors');

    let savedColors = {};

    try {
        savedColors = stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.warn('Failed to parse saved colors:', e);
    }

    currentColors = { ...DEFAULT_COLORS, ...savedColors };

    initTheme();
    logData = await getAuditLogs();
    filteredLogs = [...logData];

    const types = [...new Set(logData.map(l => l.type))];
    populateTypeFilter();
    updateColorControls(types);


    DOM.logTypeFilter.innerHTML = `<option value="all">All Types</option>${types.map(t => `<option value="${t}">${capitalize(t)}</option>`).join('')}`;

    const savedChartType = localStorage.getItem('chartType');
    if (savedChartType && DOM.chartType.querySelector(`option[value="${savedChartType}"]`)) {
        DOM.chartType.value = savedChartType;
    }


    updateChart();
    updateTable();
    updatePagination();


    const toggleBtn = document.getElementById('toggleColorSettings');
    const panel = document.getElementById('colorSettingsPanel');

    toggleBtn.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });


    DOM.themeToggle.addEventListener('click', toggleTheme);
    DOM.chartType.addEventListener('change', () => {
        const type = DOM.chartType.value;
        localStorage.setItem('chartType', type);
        updateChart();
    });

    DOM.prevPage.addEventListener('click', () => goToPage(currentPage - 1));
    DOM.nextPage.addEventListener('click', () => goToPage(currentPage + 1));

    DOM.search.addEventListener('input', applyFilters);
    DOM.logTypeFilter.addEventListener('change', applyFilters);
    DOM.timeRange.addEventListener('change', () => {
        const showCustom = DOM.timeRange.value === 'custom';
        document.getElementById('customRangeContainer').style.display = showCustom ? 'flex' : 'none';
        if (!showCustom) applyFilters();
    });
    DOM.applyCustomRange.addEventListener('click', applyFilters);



    // DOM.logTypeFilter.addEventListener('change', applyFilters);
    // DOM.search.addEventListener('input', handleSearch);
    // DOM.timeRange.addEventListener('change', () => {
    //     const show = DOM.timeRange.value === 'custom';
    //     DOM.customRangeContainer.style.display = show ? 'flex' : 'none';
    //     if (!show) applyDateFilter();
    // });
    // DOM.applyCustomRange.addEventListener('click', applyDateFilter);
    DOM.entriesPerPage.value = logsPerPage;
    DOM.entriesPerPage.addEventListener('change', () => {
        logsPerPage = +DOM.entriesPerPage.value;
        localStorage.setItem('logsPerPage', logsPerPage);
        currentPage = 1;
        updateTable();
        updatePagination();
    });
    DOM.closeModal.addEventListener('click', () => DOM.modal.style.display = 'none');
    window.addEventListener('click', e => { if (e.target === DOM.modal) DOM.modal.style.display = 'none'; });
}

function applyFilters() {
    const selectedType = DOM.logTypeFilter.value;
    const selectedRange = DOM.timeRange.value;
    const searchTerm = DOM.search.value.toLowerCase();

    let filtered = [...logData];

    // Filter by type
    if (selectedType !== 'all') {
        filtered = filtered.filter(log => log.type === selectedType);
    }

    // Filter by time range
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));

    filtered = filtered.filter(log => {
        const time = new Date(log.timeStamp);
        switch (selectedRange) {
            case 'today':
                return time >= today;
            case 'yesterday':
                const yest = new Date(today);
                yest.setDate(today.getDate() - 1);
                return time >= yest && time < today;
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                return time >= weekStart;
            case 'month':
                const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                return time >= monthStart;
            case 'custom':
                const start = new Date(DOM.startDate.value);
                const end = new Date(DOM.endDate.value);
                return time >= start && time <= end;
            default:
                return true;
        }
    });

    // Search filter
    if (searchTerm) {
        filtered = filtered.filter(log =>
            Object.values(log).some(v => v?.toString().toLowerCase().includes(searchTerm))
        );
    }

    filteredLogs = filtered;
    currentPage = 1;
    updateChart();
    updateTable();
    updatePagination();
    updateColorControls([...new Set(filteredLogs.map(log => log.type))]);
}


function populateTypeFilter() {
    const types = [...new Set(logData.map(log => log.type))];
    DOM.logTypeFilter.innerHTML = `<option value="all">All Types</option>`;
    types.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        opt.textContent = capitalize(type);
        DOM.logTypeFilter.appendChild(opt);
    });
}


function handleSearch() {
    const term = DOM.search.value.toLowerCase();
    filteredLogs = logData.filter(log =>
        Object.values(log).some(v => v?.toString().toLowerCase().includes(term))
    );
    currentPage = 1;
    updateTable();
    updatePagination();
}

document.addEventListener('DOMContentLoaded', initDashboard);
