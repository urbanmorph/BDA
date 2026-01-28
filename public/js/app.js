// BDA Dashboard - Main Application
// Vanilla JavaScript with Tailwind CSS

// Global variables
let layoutsData = [];
let layoutsBoundariesData = null;
let departmentsData = null;
let sourcesData = null;
let administrativeBoundariesData = null;
let gbaCorporationData = null;
let bdaJurisdictionData = null;
let planningDistrictsData = null;
let currentPlanVersion = '2015';
let map; // Master Plan map
let layoutsMap; // Layouts map
let charts = {};
let layoutLayers = [];
let adminBoundaryLayers = [];

// Initialize app on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('BDA Dashboard initializing...');
    loadData();
    loadDepartmentsData();
    loadSourcesData();
    loadLayoutsBoundaries();
    loadAdministrativeBoundaries();
    loadPlanningDistricts();
    initializeCharts();
    initializeMap();
    setupEventListeners();
    setupMobileMenu();
    showSection('overview');
});

// Load JSON data
async function loadData() {
    try {
        const response = await fetch('data/layouts-all-1017.json');
        const data = await response.json();
        layoutsData = data.layouts;
        console.log(`Loaded ${layoutsData.length} layouts`);
        populateLayoutsTable(layoutsData);
        updateCharts(data);
        populateTalukFilter(data);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Load Layout Boundaries Data
async function loadLayoutsBoundaries() {
    try {
        const response = await fetch('data/layouts-boundaries.json');
        layoutsBoundariesData = await response.json();
        console.log(`Loaded ${layoutsBoundariesData.layouts.length} layout boundaries`);
        if (layoutsMap) {
            addLayoutBoundariesToMap();
        }
    } catch (error) {
        console.error('Error loading layout boundaries:', error);
    }
}

// Load Administrative Boundaries Data
async function loadAdministrativeBoundaries() {
    try {
        // Load administrative boundaries metadata
        const adminResponse = await fetch('data/administrative-boundaries.json');
        administrativeBoundariesData = await adminResponse.json();
        console.log('Loaded administrative boundaries metadata');

        // Load GBA corporation GeoJSON
        const gbaResponse = await fetch('data/gba_corporation.geojson');
        gbaCorporationData = await gbaResponse.json();
        console.log(`Loaded ${gbaCorporationData.features.length} GBA corporations`);

        // Load BDA jurisdiction GeoJSON
        const bdaResponse = await fetch('data/bda_jurisdiction.geojson');
        bdaJurisdictionData = await bdaResponse.json();
        console.log('Loaded BDA jurisdiction boundary');

        if (map) {
            addAdministrativeBoundariesToMap();
        }
    } catch (error) {
        console.error('Error loading administrative boundaries:', error);
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

    // Highlight active button (only if called from an event)
    if (typeof event !== 'undefined' && event.target) {
        event.target.classList.add('bg-earth-700', 'text-white');
        event.target.classList.remove('text-earth-700');
    }

    // Resize maps if needed
    if (sectionName === 'master-plan' && map) {
        setTimeout(() => map.invalidateSize(), 100);
    }
    if (sectionName === 'layouts' && layoutsMap) {
        setTimeout(() => layoutsMap.invalidateSize(), 100);
    }

    // Populate departments section if needed
    if (sectionName === 'departments' && departmentsData) {
        setTimeout(() => populateDepartmentsSection(), 100);
    }
}

// Initialize Leaflet Map
function initializeMap() {
    // Bengaluru coordinates
    const bengaluruCenter = [12.9716, 77.5946];

    // Initialize Master Plan Map
    map = L.map('map').setView(bengaluruCenter, 11);

    // Add OpenStreetMap tiles (minimalist style)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);

    // Add administrative boundaries if data is loaded
    if (gbaCorporationData) {
        addAdministrativeBoundariesToMap();
    }

    // Initialize Layouts Map
    layoutsMap = L.map('layoutsMap').setView(bengaluruCenter, 11);

    // Add OpenStreetMap tiles to layouts map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(layoutsMap);

    // Add layout boundaries if data is loaded
    if (layoutsBoundariesData) {
        addLayoutBoundariesToMap();
    }
}

// Add Administrative Boundaries to Master Plan Map
function addAdministrativeBoundariesToMap() {
    if (!map) return;

    // Clear existing boundary layers
    adminBoundaryLayers.forEach(layer => map.removeLayer(layer));
    adminBoundaryLayers = [];

    // Add BDA jurisdiction boundary (outer peripheral area)
    if (bdaJurisdictionData) {
        const bdaLayer = L.geoJSON(bdaJurisdictionData, {
            style: {
                color: earthColors.primary,
                weight: 3,
                fillColor: earthColors.primary,
                fillOpacity: 0.05,
                opacity: 0.7,
                dashArray: '10, 10'
            },
            onEachFeature: function(feature, layer) {
                layer.bindPopup(`
                    <div class="p-2">
                        <p class="font-semibold text-sm">BDA Jurisdiction</p>
                        <p class="text-xs text-earth-600 mt-1">Bangalore Development Authority</p>
                        <p class="text-xs text-earth-600">Area: 582 km²</p>
                        <p class="text-xs text-gray-500 mt-1">Peripheral areas outside GBA core</p>
                        <p class="text-xs text-amber-600 mt-1">⚠️ Approximate boundary</p>
                    </div>
                `);
            }
        });
        bdaLayer.addTo(map);
        adminBoundaryLayers.push(bdaLayer);
        console.log('Added BDA jurisdiction boundary to map');
    }

    // Add GBA corporation boundaries (core city area)
    if (gbaCorporationData) {
        console.log(`Adding ${gbaCorporationData.features.length} GBA corporation boundaries to map`);

        // Define colors for each corporation
        const corporationColors = {
            'Bengaluru North City Corporation': '#3b82f6',    // blue
            'Bengaluru West City Corporation': '#8b5cf6',     // purple
            'Bengaluru East City Corporation': '#f59e0b',     // amber
            'Bengaluru South City Corporation': '#10b981',    // emerald
            'Bengaluru Central City Corporation': '#ef4444'   // red
        };

        gbaCorporationData.features.forEach(feature => {
            const corpName = feature.properties.namecol;
            const color = corporationColors[corpName] || '#6b7280';

            // Create GeoJSON layer
            const geoJsonLayer = L.geoJSON(feature, {
                style: {
                    color: color,
                    weight: 3,
                    fillColor: color,
                    fillOpacity: 0.15,
                    opacity: 0.9
                },
                onEachFeature: function(feature, layer) {
                    // Add popup
                    layer.bindPopup(`
                        <div class="p-2">
                            <p class="font-semibold text-sm">${corpName}</p>
                            <p class="text-xs text-gray-600 mt-1">Greater Bengaluru Authority</p>
                            <p class="text-xs text-gray-500 mt-1">One of 5 municipal corporations</p>
                        </div>
                    `);

                    // Add hover effect
                    layer.on('mouseover', function() {
                        this.setStyle({
                            fillOpacity: 0.3,
                            weight: 4
                        });
                    });

                    layer.on('mouseout', function() {
                        this.setStyle({
                            fillOpacity: 0.15,
                            weight: 3
                        });
                    });
                }
            });

            geoJsonLayer.addTo(map);
            adminBoundaryLayers.push(geoJsonLayer);
        });

        console.log(`Added ${adminBoundaryLayers.length} administrative boundaries to map`);
    }
}

// Add Layout Boundaries to Map
function addLayoutBoundariesToMap() {
    if (!layoutsBoundariesData || !layoutsMap) return;

    // Clear existing boundary layers
    layoutLayers.forEach(layer => layoutsMap.removeLayer(layer));
    layoutLayers = [];

    console.log(`Adding ${layoutsBoundariesData.layouts.length} layout boundaries to layoutsMap`);

    layoutsBoundariesData.layouts.forEach(layout => {
        if (layout.coordinates && layout.coordinates.length > 0) {
            // Create polygon
            const polygon = L.polygon(layout.coordinates, {
                color: earthColors.primary,
                weight: 2,
                fillColor: earthColors.secondary,
                fillOpacity: 0.15,
                opacity: 0.6
            });

            // Add popup with layout information
            polygon.bindPopup(`
                <div class="p-2">
                    <p class="font-semibold text-sm text-earth-800">${layout.name}</p>
                    <p class="text-xs text-earth-600 mt-1">Layout No: ${layout.layout_no || 'N/A'}</p>
                    <p class="text-xs text-earth-600">Area: ${layout.area_acres ? layout.area_acres.toFixed(2) : 'N/A'} acres</p>
                    ${layout.taluk ? `<p class="text-xs text-earth-600">Taluk: ${layout.taluk}</p>` : ''}
                </div>
            `);

            // Add hover effect
            polygon.on('mouseover', function() {
                this.setStyle({
                    fillOpacity: 0.35,
                    weight: 3
                });
            });

            polygon.on('mouseout', function() {
                this.setStyle({
                    fillOpacity: 0.15,
                    weight: 2
                });
            });

            polygon.addTo(layoutsMap);
            layoutLayers.push(polygon);
        }
    });

    console.log(`Added ${layoutLayers.length} layout boundaries to layoutsMap`);
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
                labels: ['Work/Employment', 'Education', 'Marriage', 'Family Move', 'Other'],
                datasets: [{
                    label: 'Percentage',
                    data: [52, 18, 15, 11, 4],
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

// Populate Taluk Filter
function populateTalukFilter(data) {
    const talukFilter = document.getElementById('talukFilter');
    if (!talukFilter || !data.administrative_divisions) return;

    // Clear existing options except "All Taluks"
    talukFilter.innerHTML = '<option value="">All Taluks</option>';

    // Add taluks from data
    const taluks = data.administrative_divisions.taluks.filter(t => t && t !== 'Unknown' && t.trim() !== '');
    taluks.forEach(taluk => {
        const option = document.createElement('option');
        option.value = taluk;
        option.textContent = taluk;
        talukFilter.appendChild(option);
    });
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

// Load Planning Districts Data
async function loadPlanningDistricts() {
    try {
        const response = await fetch('data/planning-districts.json');
        planningDistrictsData = await response.json();
        console.log('Loaded planning districts data');
        displayPlanningDistricts(currentPlanVersion);
    } catch (error) {
        console.error('Error loading planning districts:', error);
    }
}

// Display Planning Districts
function displayPlanningDistricts(version) {
    if (!planningDistrictsData) return;

    const container = document.getElementById('planningDistrictsContainer');
    const subtitle = document.getElementById('planningDistrictSubtitle');

    if (!container || !subtitle) return;

    container.innerHTML = '';

    const planData = version === '2015' ? planningDistrictsData.rmp_2015 : planningDistrictsData.rmp_2031;

    // Update subtitle
    subtitle.textContent = `${planData.total_districts} districts for RMP ${version} - ${planData.status}`;

    // Display districts
    planData.districts.forEach(district => {
        const districtCard = document.createElement('div');
        districtCard.className = 'bg-earth-50 hover:bg-earth-100 border border-earth-200 rounded-lg p-3 cursor-pointer transition-colors';

        const wardInfo = district.wards ? `<p class="text-xs text-earth-500 mt-1">${district.wards.length} wards</p>` : '';
        const villageInfo = district.villages ? `<p class="text-xs text-earth-500 mt-1">${district.villages.length} villages</p>` : '';

        districtCard.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <p class="font-semibold text-earth-800 text-sm">${district.id}</p>
                    <p class="text-xs text-earth-600 mt-0.5">${district.name}</p>
                    ${wardInfo}
                    ${villageInfo}
                </div>
            </div>
        `;

        container.appendChild(districtCard);
    });

    console.log(`Displayed ${planData.districts.length} planning districts for RMP ${version}`);
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

    // Update current plan version and refresh display
    currentPlanVersion = version;
    displayPlanningDistricts(version);
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
    if (!container) {
        console.error('departmentCardsContainer not found');
        return;
    }

    console.log('Populating department cards, departments count:', departmentsData.departments.length);
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

// Load Sources Data
async function loadSourcesData() {
    try {
        const response = await fetch('data/sources.json');
        sourcesData = await response.json();
        console.log('Loaded sources data');
        populateSourcesSection();
    } catch (error) {
        console.error('Error loading sources data:', error);
    }
}

// Populate Sources Section
function populateSourcesSection() {
    if (!sourcesData) return;

    // Populate source categories
    const container = document.getElementById('sourceCategoriesContainer');
    if (container) {
        container.innerHTML = '';

        sourcesData.source_categories.forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'bg-white border border-earth-200 rounded-lg overflow-hidden';

            const sourcesHTML = category.sources.map(source => `
                <div class="px-6 py-4 border-b border-earth-100 last:border-0">
                    <div class="flex items-start justify-between mb-2">
                        <h4 class="font-semibold text-earth-800 text-sm flex-1">${source.title}</h4>
                        <span class="text-xs text-earth-500 ml-2">${source.year || 'N/A'}</span>
                    </div>
                    <p class="text-xs text-earth-600 mb-2">${source.organization}</p>
                    <p class="text-xs text-earth-700 mb-2">${source.coverage}</p>
                    ${source.note ? `<p class="text-xs text-terracotta-600 mb-2 italic">${source.note}</p>` : ''}
                    <div class="flex items-center justify-between mt-2">
                        <a href="${source.url}" target="_blank" class="text-xs text-sage-600 hover:text-sage-800 underline break-all">
                            ${source.url.length > 60 ? source.url.substring(0, 60) + '...' : source.url}
                        </a>
                    </div>
                    <p class="text-xs text-earth-500 mt-2">Used in: ${source.data_used_in.join(', ')}</p>
                </div>
            `).join('');

            categoryDiv.innerHTML = `
                <div class="px-6 py-4 bg-earth-50 border-b border-earth-200">
                    <h3 class="text-lg font-semibold text-earth-800">${category.category}</h3>
                    <p class="text-xs text-earth-600 mt-1">${category.sources.length} sources</p>
                </div>
                <div>
                    ${sourcesHTML}
                </div>
            `;

            container.appendChild(categoryDiv);
        });
    }

    // Populate methodology notes
    const methodologyContainer = document.getElementById('methodologyNotes');
    if (methodologyContainer && sourcesData.methodology_notes) {
        methodologyContainer.innerHTML = '';

        Object.entries(sourcesData.methodology_notes).forEach(([key, value]) => {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'text-sm';
            noteDiv.innerHTML = `
                <h4 class="font-semibold text-earth-700 mb-1">${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                <p class="text-earth-600">${value}</p>
            `;
            methodologyContainer.appendChild(noteDiv);
        });

        // Add data quality notes
        if (sourcesData.data_quality_notes) {
            const qualityDiv = document.createElement('div');
            qualityDiv.className = 'mt-4 pt-4 border-t border-earth-200';
            qualityDiv.innerHTML = '<h4 class="font-semibold text-earth-700 mb-2">Data Quality Notes</h4>';

            Object.entries(sourcesData.data_quality_notes).forEach(([key, value]) => {
                const noteP = document.createElement('p');
                noteP.className = 'text-sm text-earth-600 mb-2';
                noteP.innerHTML = `<strong>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> ${value}`;
                qualityDiv.appendChild(noteP);
            });

            methodologyContainer.appendChild(qualityDiv);
        }
    }
}

// Export Sources
function exportSources() {
    if (!sourcesData) return;

    const dataStr = JSON.stringify(sourcesData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'bda-data-sources.json');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Setup Mobile Menu
function setupMobileMenu() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });

        // Close mobile menu when a nav item is clicked
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                mobileMenu.classList.add('hidden');
            });
        });
    }
}

// Make functions globally available
window.showSection = showSection;
window.togglePlan = togglePlan;
window.exportLayouts = exportLayouts;
window.exportSources = exportSources;
