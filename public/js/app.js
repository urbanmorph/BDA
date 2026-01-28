// BDA Dashboard - Main Application
// Vanilla JavaScript with Tailwind CSS

// Global variables
let layoutsData = [];
let departmentsData = null;
let map;
let charts = {};

// Initialize app on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('BDA Dashboard initializing...');
    loadData();
    loadDepartmentsData();
    initializeCharts();
    initializeMap();
    setupEventListeners();
    showSection('overview');
});

// Load JSON data
async function loadData() {
    try {
        const response = await fetch('data/layouts-sample.json');
        const data = await response.json();
        layoutsData = data.layouts;
        console.log(`Loaded ${layoutsData.length} layouts`);
        populateLayoutsTable(layoutsData);
        updateCharts(data);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Section navigation
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section-content').forEach(section => {
        section.classList.add('hidden');
    });

    // Show selected section
    const selectedSection = document.getElementById(`${sectionName}-section`);
    if (selectedSection) {
        selectedSection.classList.remove('hidden');
    }

    // Update nav button styles
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-earth-700', 'text-white');
        btn.classList.add('text-earth-700');
    });

    // Highlight active button
    event.target.classList.add('bg-earth-700', 'text-white');
    event.target.classList.remove('text-earth-700');

    // Resize map if needed
    if (sectionName === 'master-plan' && map) {
        setTimeout(() => map.invalidateSize(), 100);
    }
}

// Initialize Leaflet Map
function initializeMap() {
    // Bengaluru coordinates
    const bengaluruCenter = [12.9716, 77.5946];

    map = L.map('map').setView(bengaluruCenter, 11);

    // Add OpenStreetMap tiles (minimalist style)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);

    // Add sample layout markers (using sample data)
    if (layoutsData.length > 0) {
        addLayoutMarkers();
    }

    // Add city boundary (approximate)
    const cityBounds = [
        [12.7342, 77.3791],
        [13.1734, 77.8746]
    ];
    L.rectangle(cityBounds, {
        color: '#000',
        weight: 2,
        fillOpacity: 0.05
    }).addTo(map);
}

function addLayoutMarkers() {
    // For demo, add markers for sample layouts at approximate locations
    const sampleLocations = [
        { name: 'Wilson Garden HBCS', lat: 12.9352, lng: 77.6245, type: 'Residential' },
        { name: 'UAS Employee HBCS', lat: 13.0294, lng: 77.5518, type: 'Residential' },
        { name: 'KSRTC Employees', lat: 12.9141, lng: 77.5637, type: 'Residential' },
        { name: 'PSR Bhat Artha Feeds', lat: 12.9089, lng: 77.5747, type: 'Industrial' },
        { name: 'Icon Developers', lat: 12.9234, lng: 77.7567, type: 'Residential' }
    ];

    sampleLocations.forEach(location => {
        const markerColor = location.type === 'Industrial' ? 'red' : 'blue';
        const marker = L.circleMarker([location.lat, location.lng], {
            radius: 6,
            fillColor: markerColor,
            color: '#fff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(map);

        marker.bindPopup(`
            <div class="p-2">
                <p class="font-semibold text-sm">${location.name}</p>
                <p class="text-xs text-gray-600">${location.type}</p>
            </div>
        `);
    });
}

// Earthy color palette
const earthColors = {
    primary: '#8b6f47',      // earth-500
    secondary: '#7a8c5e',    // sage-500
    accent: '#c85a36',       // terracotta-500
    light: '#d4c9ba',        // earth-200
    dark: '#2a1f17'          // earth-900
};

// Initialize Charts
function initializeCharts() {
    // Decade Chart
    const decadeCtx = document.getElementById('decadeChart');
    if (decadeCtx) {
        charts.decade = new Chart(decadeCtx, {
            type: 'bar',
            data: {
                labels: ['1970s', '1980s', '1990s', '2000s', '2010s', '2020s'],
                datasets: [{
                    label: 'Layouts Approved',
                    data: [48, 195, 287, 245, 156, 86],
                    backgroundColor: earthColors.primary,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: earthColors.primary },
                        grid: { color: earthColors.light }
                    },
                    x: {
                        ticks: { color: earthColors.primary },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // Use Type Pie Chart
    const useTypeCtx = document.getElementById('useTypeChart');
    if (useTypeCtx) {
        charts.useType = new Chart(useTypeCtx, {
            type: 'doughnut',
            data: {
                labels: ['Residential', 'Industrial', 'Commercial'],
                datasets: [{
                    data: [934, 51, 32],
                    backgroundColor: [earthColors.primary, earthColors.secondary, earthColors.accent],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: earthColors.primary, padding: 15 }
                    }
                }
            }
        });
    }

    // Population Growth Chart
    const populationCtx = document.getElementById('populationChart');
    if (populationCtx) {
        charts.population = new Chart(populationCtx, {
            type: 'line',
            data: {
                labels: ['1971', '1981', '1991', '2001', '2011', '2021', '2031'],
                datasets: [{
                    label: 'Population (Millions)',
                    data: [1.7, 2.9, 4.1, 5.7, 8.5, 13.6, 20.0],
                    borderColor: earthColors.accent,
                    backgroundColor: 'rgba(200, 90, 54, 0.1)',
                    tension: 0.3,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: earthColors.accent
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: earthColors.primary,
                            callback: value => value + 'M'
                        },
                        grid: { color: earthColors.light }
                    },
                    x: {
                        ticks: { color: earthColors.primary },
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // Migration Chart
    const migrationCtx = document.getElementById('migrationChart');
    if (migrationCtx) {
        charts.migration = new Chart(migrationCtx, {
            type: 'bar',
            data: {
                labels: ['Work/Employment', 'Marriage', 'Family Move', 'Education', 'Other'],
                datasets: [{
                    label: 'Percentage',
                    data: [35, 25, 15, 12, 13],
                    backgroundColor: earthColors.secondary,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 40,
                        ticks: {
                            color: earthColors.primary,
                            callback: value => value + '%'
                        },
                        grid: { color: earthColors.light }
                    },
                    y: {
                        ticks: { color: earthColors.primary },
                        grid: { display: false }
                    }
                }
            }
        });
    }
}

function updateCharts(data) {
    if (data.summary && charts.decade) {
        const decadeData = data.summary.by_decade;
        charts.decade.data.datasets[0].data = Object.values(decadeData);
        charts.decade.update();
    }

    if (data.summary && charts.useType) {
        const useTypeData = data.summary.by_use_type;
        charts.useType.data.datasets[0].data = Object.values(useTypeData);
        charts.useType.update();
    }
}

// Populate Layouts Table
function populateLayoutsTable(layouts) {
    const tbody = document.getElementById('layoutsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    layouts.forEach(layout => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${layout.id}</td>
            <td class="px-6 py-4 text-sm font-medium text-gray-900">${layout.name}</td>
            <td class="px-6 py-4 text-sm text-gray-500">${layout.village}, ${layout.taluk}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${layout.extent_original}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(layout.approval_date)}</td>
            <td class="px-6 py-4 text-sm text-gray-500">
                <span class="px-2 py-1 text-xs rounded-full ${getUseBadgeClass(layout.use_type_category)}">
                    ${layout.use_type_category}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });

    document.getElementById('layoutCount').textContent = layouts.length;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function getUseBadgeClass(useType) {
    switch (useType) {
        case 'Residential':
            return 'bg-earth-100 text-earth-800';
        case 'Industrial':
            return 'bg-sage-600 text-white';
        case 'Commercial':
            return 'bg-terracotta-500 text-white';
        default:
            return 'bg-earth-100 text-earth-600';
    }
}

// Event Listeners
function setupEventListeners() {
    // Search and filter inputs
    const searchInput = document.getElementById('layoutSearch');
    const talukFilter = document.getElementById('talukFilter');
    const useTypeFilter = document.getElementById('useTypeFilter');
    const yearFilter = document.getElementById('yearFilter');

    if (searchInput) {
        searchInput.addEventListener('input', filterLayouts);
    }
    if (talukFilter) {
        talukFilter.addEventListener('change', filterLayouts);
    }
    if (useTypeFilter) {
        useTypeFilter.addEventListener('change', filterLayouts);
    }
    if (yearFilter) {
        yearFilter.addEventListener('input', filterLayouts);
    }
}

function filterLayouts() {
    const searchTerm = document.getElementById('layoutSearch')?.value.toLowerCase() || '';
    const taluk = document.getElementById('talukFilter')?.value || '';
    const useType = document.getElementById('useTypeFilter')?.value || '';
    const year = document.getElementById('yearFilter')?.value || '';

    const filtered = layoutsData.filter(layout => {
        const matchesSearch = layout.name.toLowerCase().includes(searchTerm) ||
                            layout.village.toLowerCase().includes(searchTerm);
        const matchesTaluk = !taluk || layout.taluk === taluk;
        const matchesUseType = !useType || layout.use_type_category === useType;
        const matchesYear = !year || layout.approval_year.toString() === year;

        return matchesSearch && matchesTaluk && matchesUseType && matchesYear;
    });

    populateLayoutsTable(filtered);
}

// Plan version toggle
function togglePlan(version) {
    const btn2015 = document.getElementById('plan-2015');
    const btn2031 = document.getElementById('plan-2031');

    if (version === '2015') {
        btn2015.className = 'plan-toggle px-4 py-2 text-sm font-medium bg-earth-700 text-white rounded-lg';
        btn2031.className = 'plan-toggle px-4 py-2 text-sm font-medium text-earth-700 bg-white border border-earth-200 rounded-lg';
    } else {
        btn2031.className = 'plan-toggle px-4 py-2 text-sm font-medium bg-earth-700 text-white rounded-lg';
        btn2015.className = 'plan-toggle px-4 py-2 text-sm font-medium text-earth-700 bg-white border border-earth-200 rounded-lg';
    }

    // Update map or data based on selected plan
    console.log(`Switched to RMP ${version}`);
}

// Export function for layouts data
function exportLayouts() {
    const csv = convertToCSV(layoutsData);
    downloadCSV(csv, 'bda-layouts.csv');
}

function convertToCSV(arr) {
    const headers = Object.keys(arr[0]);
    const rows = arr.map(obj =>
        headers.map(header => JSON.stringify(obj[header] || '')).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Load Departments Data
async function loadDepartmentsData() {
    try {
        const response = await fetch('data/departments.json');
        departmentsData = await response.json();
        console.log('Loaded departments data');
        populateDepartmentsSection();
    } catch (error) {
        console.error('Error loading departments data:', error);
    }
}

// Populate Departments Section
function populateDepartmentsSection() {
    if (!departmentsData) return;

    // Populate department cards
    populateDepartmentCards();

    // Populate performance highlights
    populatePerformanceHighlights();

    // Populate critical gaps
    populateCriticalGaps();

    // Populate detailed analysis
    populateDepartmentAnalysis();

    // Populate overall assessment
    populateOverallAssessment();

    // Populate sources
    populateSources();
}

// Populate Department Cards
function populateDepartmentCards() {
    const container = document.getElementById('departmentCardsContainer');
    if (!container) return;

    container.innerHTML = '';

    departmentsData.departments.forEach(dept => {
        const card = document.createElement('div');
        card.className = 'bg-white border border-earth-200 rounded-lg p-6 hover:border-sage-400 transition-colors';

        const functionsCount = dept.statutory_functions.length;
        const strengthsCount = dept.performance_gap?.strengths?.length || 0;
        const weaknessesCount = dept.performance_gap?.weaknesses?.length || 0;

        card.innerHTML = `
            <h3 class="text-lg font-semibold text-earth-800 mb-2">${dept.name}</h3>
            <p class="text-sm text-earth-600 mb-4">${dept.head}</p>
            <div class="space-y-2">
                <div class="flex justify-between text-sm">
                    <span class="text-earth-600">Statutory Functions</span>
                    <span class="font-semibold text-earth-800">${functionsCount}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-sage-600">Strengths</span>
                    <span class="font-semibold text-sage-700">${strengthsCount}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-terracotta-600">Gaps</span>
                    <span class="font-semibold text-terracotta-700">${weaknessesCount}</span>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

// Populate Performance Highlights
function populatePerformanceHighlights() {
    const container = document.getElementById('performanceHighlights');
    if (!container || !departmentsData.overall_assessment) return;

    container.innerHTML = '';

    departmentsData.overall_assessment.performance_highlights.forEach(highlight => {
        const li = document.createElement('li');
        li.className = 'flex items-start';
        li.innerHTML = `
            <svg class="h-5 w-5 text-sage-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span class="text-sm text-earth-700">${highlight}</span>
        `;
        container.appendChild(li);
    });
}

// Populate Critical Gaps
function populateCriticalGaps() {
    const container = document.getElementById('criticalGaps');
    if (!container || !departmentsData.overall_assessment) return;

    container.innerHTML = '';

    departmentsData.overall_assessment.critical_gaps.forEach(gap => {
        const li = document.createElement('li');
        li.className = 'flex items-start';
        li.innerHTML = `
            <svg class="h-5 w-5 text-terracotta-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
            <span class="text-sm text-earth-700">${gap}</span>
        `;
        container.appendChild(li);
    });
}

// Populate Department Analysis
function populateDepartmentAnalysis() {
    const container = document.getElementById('departmentAnalysisContainer');
    if (!container) return;

    container.innerHTML = '';

    departmentsData.departments.forEach((dept, index) => {
        const deptSection = document.createElement('div');
        deptSection.className = 'border border-earth-200 rounded-lg p-6';

        let functionsHTML = dept.statutory_functions.map(func => `
            <div class="mb-3 pb-3 border-b border-earth-100 last:border-0">
                <p class="font-medium text-sm text-earth-800 mb-1">${func.function}</p>
                <p class="text-xs text-earth-600 mb-1">${func.description}</p>
                <p class="text-xs text-sage-600">Act Section: ${func.act_section}</p>
            </div>
        `).join('');

        let strengthsHTML = '';
        if (dept.performance_gap?.strengths) {
            strengthsHTML = dept.performance_gap.strengths.map(s => `
                <li class="text-sm text-earth-700">${s}</li>
            `).join('');
        }

        let weaknessesHTML = '';
        if (dept.performance_gap?.weaknesses) {
            weaknessesHTML = dept.performance_gap.weaknesses.map(w => `
                <li class="text-sm text-earth-700">${w}</li>
            `).join('');
        }

        deptSection.innerHTML = `
            <h4 class="text-lg font-semibold text-earth-800 mb-1">${dept.name}</h4>
            <p class="text-sm text-earth-600 mb-4">${dept.head}</p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h5 class="text-sm font-semibold text-earth-700 mb-3">Statutory Functions</h5>
                    <div class="space-y-2">
                        ${functionsHTML}
                    </div>
                </div>

                <div>
                    <h5 class="text-sm font-semibold text-sage-700 mb-2">Strengths</h5>
                    <ul class="space-y-1 mb-4 list-disc list-inside">
                        ${strengthsHTML || '<li class="text-sm text-earth-500">No data</li>'}
                    </ul>

                    <h5 class="text-sm font-semibold text-terracotta-700 mb-2">Gaps & Weaknesses</h5>
                    <ul class="space-y-1 list-disc list-inside">
                        ${weaknessesHTML || '<li class="text-sm text-earth-500">No data</li>'}
                    </ul>
                </div>
            </div>
        `;

        container.appendChild(deptSection);
    });
}

// Populate Overall Assessment
function populateOverallAssessment() {
    const ratingEl = document.getElementById('complianceRating');
    const explanationEl = document.getElementById('complianceExplanation');
    const recommendationsEl = document.getElementById('recommendations');

    if (!departmentsData.overall_assessment) return;

    const assessment = departmentsData.overall_assessment;

    if (ratingEl) {
        ratingEl.textContent = assessment.statutory_compliance.rating;
    }

    if (explanationEl) {
        explanationEl.textContent = assessment.statutory_compliance.explanation;
    }

    if (recommendationsEl) {
        recommendationsEl.innerHTML = '';
        assessment.recommendations.forEach(rec => {
            const li = document.createElement('li');
            li.textContent = rec;
            recommendationsEl.appendChild(li);
        });
    }
}

// Populate Sources
function populateSources() {
    const container = document.getElementById('departmentSources');
    if (!container || !departmentsData.sources) return;

    container.innerHTML = '';

    departmentsData.sources.forEach(source => {
        const div = document.createElement('div');
        div.innerHTML = `<a href="${source.url}" target="_blank" class="text-sage-600 hover:text-sage-800 underline">${source.title}</a> (${source.type})`;
        container.appendChild(div);
    });
}

// Make functions globally available
window.showSection = showSection;
window.togglePlan = togglePlan;
window.exportLayouts = exportLayouts;
