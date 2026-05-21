// BDA Dashboard - Main Application
// Vanilla JavaScript with Tailwind CSS

import './revenue-store.js';

// Global variables
let layoutsData = [];
let layoutsBoundariesData = null;
let departmentsData = null;
let sourcesData = null;
let administrativeBoundariesData = null;
let gbaCorporationData = null;
let bdaJurisdictionData = null;
let planningDistrictsData = null;
let economicData = null;
let eAuctionData = null;
let infrastructureData = null;
let currentPlanVersion = '2015';
let layoutsMap; // Layouts map
let charts = {};
let layoutLayers = [];
let adminBoundaryLayers = [];

// Known section routes — used by both URL <-> section sync.
// Any section id present in the DOM is a valid route; this list keeps the
// pathname parser strict so we don't match arbitrary URLs.
const SECTION_ROUTES = new Set([
    'overview', 'revenue',
    'master-plan', 'layouts', 'e-auction', 'departments',
    'demographics', 'economic', 'infrastructure', 'environment',
    'sources'
]);
let suppressHistoryPush = false;

function sectionFromUrl() {
    const seg = (location.pathname.replace(/^\/+|\/+$/g, '').split('/')[0] || '').toLowerCase();
    return SECTION_ROUTES.has(seg) ? seg : 'overview';
}

// Navigation configuration
const navigationConfig = {
    development: {
        defaultSection: 'master-plan',
        subsections: ['master-plan', 'layouts', 'e-auction', 'departments']
    },
    analytics: {
        defaultSection: 'demographics',
        subsections: ['demographics', 'economic', 'infrastructure', 'environment']
    }
};

// Initialize app on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('BDA Dashboard initializing...');
    loadData();
    loadDepartmentsData();
    loadSourcesData();
    loadLayoutsBoundaries();
    loadAdministrativeBoundaries();
    loadPlanningDistricts();
    loadEconomicData();
    loadEAuctionData();
    loadInfrastructureData();
    loadRevenueData();
    initializeCharts();
    initializeMap();
    setupEventListeners();
    setupMobileMenu();
    // Restore section from URL on initial load (e.g. opening /revenue directly).
    // Use replaceState so the back button doesn't bounce to a synthetic entry.
    suppressHistoryPush = true;
    const initial = sectionFromUrl();
    showSection(initial);
    history.replaceState({ section: initial }, '', '/' + initial);
    suppressHistoryPush = false;

    // Back/forward should re-render the corresponding section without pushing.
    window.addEventListener('popstate', () => {
        suppressHistoryPush = true;
        showSection(sectionFromUrl());
        suppressHistoryPush = false;
    });

    // Close dropdowns when clicking outside navigation
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.nav-category-wrapper')) {
            document.querySelectorAll('.nav-dropdown').forEach(dd => dd.classList.add('hidden'));
        }
    });
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

        if (layoutsMap) {
            addAdministrativeBoundariesToMap();
        }
    } catch (error) {
        console.error('Error loading administrative boundaries:', error);
    }
}

// Load Economic Development Data
async function loadEconomicData() {
    try {
        const response = await fetch('data/economic-development.json');
        economicData = await response.json();
        console.log('Loaded economic development data');
        populateEconomicSection();
    } catch (error) {
        console.error('Error loading economic data:', error);
    }
}

// Load E-Auction Data
async function loadEAuctionData() {
    try {
        const response = await fetch('data/e-auction.json');
        eAuctionData = await response.json();
        console.log('Loaded e-auction data');
        populateEAuctionSection();
    } catch (error) {
        console.error('Error loading e-auction data:', error);
    }
}

// Load Infrastructure Data
async function loadInfrastructureData() {
    try {
        const response = await fetch('data/infrastructure.json');
        infrastructureData = await response.json();
        console.log('Loaded infrastructure data');
        populateInfrastructureSection();
    } catch (error) {
        console.error('Error loading infrastructure data:', error);
    }
}

// Section navigation
function showSection(sectionName, categoryName) {
    // Auto-determine category if not provided
    if (!categoryName) {
        categoryName = getCategoryForSection(sectionName);
    }

    // Hide all sections
    document.querySelectorAll('.section-content').forEach(section => {
        section.classList.add('hidden');
    });

    // Show selected section
    const selectedSection = document.getElementById(`${sectionName}-section`);
    if (selectedSection) {
        selectedSection.classList.remove('hidden');
    }

    // Update active states
    updateActiveStates(sectionName, categoryName);
    updateMobileActiveStates(sectionName, categoryName);

    // Resize layouts map if needed
    if (sectionName === 'layouts' && layoutsMap) {
        setTimeout(() => layoutsMap.invalidateSize(), 100);
    }

    // Populate departments section if needed
    if (sectionName === 'departments' && departmentsData) {
        setTimeout(() => populateDepartmentsSection(), 100);
    }

    // Revenue: ensure the active tab's lazy contents (map) get a size refresh
    if (sectionName === 'revenue') {
        setTimeout(() => onRevenueSectionShown(), 100);
    }

    // Keep the URL in sync so /revenue, /layouts etc. are linkable + back-navigable.
    if (!suppressHistoryPush && SECTION_ROUTES.has(sectionName)) {
        const newPath = '/' + sectionName;
        if (location.pathname !== newPath) {
            history.pushState({ section: sectionName }, '', newPath);
        }
    }
}

// Update active states for desktop navigation
function updateActiveStates(sectionName, categoryName) {
    // Reset all navigation buttons
    document.querySelectorAll('.nav-btn, .nav-category, .nav-subsection').forEach(btn => {
        btn.classList.remove('active-nav', 'active-category', 'active-subsection');
    });

    // Highlight standalone sections (overview, sources)
    if (!categoryName) {
        const standaloneBtn = document.querySelector(`.nav-btn[data-section="${sectionName}"]`);
        if (standaloneBtn) {
            standaloneBtn.classList.add('active-nav');
        }
    } else {
        // Highlight category
        const categoryBtn = document.querySelector(`.nav-category[data-category="${categoryName}"]`);
        if (categoryBtn) {
            categoryBtn.classList.add('active-category');
        }

        // Highlight subsection
        const subsectionBtn = document.querySelector(`.nav-subsection[data-section="${sectionName}"][data-category="${categoryName}"]`);
        if (subsectionBtn) {
            subsectionBtn.classList.add('active-subsection');
        }
    }
}

// Get category for a section
function getCategoryForSection(sectionName) {
    if (navigationConfig.development.subsections.includes(sectionName)) {
        return 'development';
    }
    if (navigationConfig.analytics.subsections.includes(sectionName)) {
        return 'analytics';
    }
    return null; // standalone section
}

// Toggle dropdown visibility
function toggleDropdown(categoryName, event) {
    if (event) {
        event.stopPropagation();
    }

    const wrapper = event?.target.closest('.nav-category-wrapper');
    if (!wrapper) return;

    const dropdown = wrapper.querySelector('.nav-dropdown');
    if (!dropdown) return;

    // Close other dropdowns
    document.querySelectorAll('.nav-dropdown').forEach(dd => {
        if (dd !== dropdown) {
            dd.classList.add('hidden');
        }
    });

    // Toggle this dropdown
    dropdown.classList.toggle('hidden');
}

// Handle category click - toggle dropdown and optionally navigate
function handleCategoryClick(categoryName, event) {
    if (event) {
        event.stopPropagation();
    }

    // Get the dropdown wrapper and dropdown element
    const wrapper = event?.target.closest('.nav-category-wrapper');
    if (!wrapper) return;

    const dropdown = wrapper.querySelector('.nav-dropdown');
    if (!dropdown) return;

    // Check if dropdown is currently hidden
    const isHidden = dropdown.classList.contains('hidden');

    // Close all other dropdowns
    document.querySelectorAll('.nav-dropdown').forEach(dd => {
        if (dd !== dropdown) {
            dd.classList.add('hidden');
        }
    });

    // Toggle this dropdown
    if (isHidden) {
        dropdown.classList.remove('hidden');
    } else {
        dropdown.classList.add('hidden');
    }
}

// Toggle mobile category accordion
function toggleMobileCategory(categoryName) {
    const subsectionsDiv = document.getElementById(`mobile-${categoryName}`);
    if (!subsectionsDiv) return;

    const categoryBtn = document.querySelector(`.mobile-category[data-category="${categoryName}"]`);
    const chevron = categoryBtn?.querySelector('.mobile-chevron');

    // Toggle visibility
    subsectionsDiv.classList.toggle('hidden');

    // Rotate chevron
    if (chevron) {
        if (subsectionsDiv.classList.contains('hidden')) {
            chevron.style.transform = 'rotate(0deg)';
        } else {
            chevron.style.transform = 'rotate(180deg)';
        }
    }
}

// Update mobile active states
function updateMobileActiveStates(sectionName, categoryName) {
    // Reset all mobile navigation buttons
    document.querySelectorAll('.mobile-nav-btn, .mobile-category, .mobile-subsection').forEach(btn => {
        btn.classList.remove('mobile-active');
    });

    // Highlight standalone sections
    if (!categoryName) {
        const standaloneBtn = document.querySelector(`.mobile-nav-btn[data-section="${sectionName}"]`);
        if (standaloneBtn) {
            standaloneBtn.classList.add('mobile-active');
        }
    } else {
        // Highlight category
        const categoryBtn = document.querySelector(`.mobile-category[data-category="${categoryName}"]`);
        if (categoryBtn) {
            categoryBtn.classList.add('mobile-active');
        }

        // Highlight subsection
        const subsectionBtn = document.querySelector(`.mobile-subsection[data-section="${sectionName}"][data-category="${categoryName}"]`);
        if (subsectionBtn) {
            subsectionBtn.classList.add('mobile-active');
        }
    }
}

// Initialize Leaflet Map
function initializeMap() {
    // Bengaluru coordinates
    const bengaluruCenter = [12.9716, 77.5946];

    // Initialize Layouts Map only (Master Plan map removed)
    layoutsMap = L.map('layoutsMap').setView(bengaluruCenter, 11);

    // Add OpenStreetMap tiles to layouts map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(layoutsMap);

    // Add administrative boundaries if data is loaded
    if (gbaCorporationData && bdaJurisdictionData) {
        addAdministrativeBoundariesToMap();
    }

    // Add layout boundaries if data is loaded
    if (layoutsBoundariesData) {
        addLayoutBoundariesToMap();
    }
}

// Add Administrative Boundaries to Layouts Map
function addAdministrativeBoundariesToMap() {
    if (!layoutsMap) return;

    // Clear existing boundary layers
    adminBoundaryLayers.forEach(layer => layoutsMap.removeLayer(layer));
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
        bdaLayer.addTo(layoutsMap);
        adminBoundaryLayers.push(bdaLayer);
        console.log('Added BDA jurisdiction boundary to layouts map');
    }

    // Add GBA corporation boundaries (core city area)
    if (gbaCorporationData) {
        console.log(`Adding ${gbaCorporationData.features.length} GBA corporation boundaries to layouts map`);

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

            geoJsonLayer.addTo(layoutsMap);
            adminBoundaryLayers.push(geoJsonLayer);
        });

        console.log(`Added ${adminBoundaryLayers.length} administrative boundaries to layouts map`);
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
        displayMasterPlanComparison(currentPlanVersion);
    } catch (error) {
        console.error('Error loading planning districts:', error);
    }
}

// Display Master Plan Comparison
function displayMasterPlanComparison(version) {
    if (!planningDistrictsData) return;

    const container = document.getElementById('masterPlanComparison');
    if (!container) return;

    const planData = version === '2015' ? planningDistrictsData.rmp_2015 : planningDistrictsData.rmp_2031;
    const comparison = planningDistrictsData.comparison.rmp_2015_vs_2031;
    const otherVersion = version === '2015' ? '2031' : '2015';
    const otherPlanData = version === '2015' ? planningDistrictsData.rmp_2031 : planningDistrictsData.rmp_2015;

    container.innerHTML = `
        <!-- Overview Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <!-- Selected Plan Overview -->
            <div class="bg-white p-6 border-2 border-earth-300 rounded-lg">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-earth-800">RMP ${version}</h3>
                    <span class="px-3 py-1 text-xs font-medium rounded-full ${version === '2015' ? 'bg-sage-100 text-sage-800' : 'bg-amber-100 text-amber-800'}">
                        ${version === '2015' ? 'Current Plan' : 'Draft Plan'}
                    </span>
                </div>
                <div class="space-y-3">
                    <div class="flex justify-between items-center py-2 border-b border-earth-100">
                        <span class="text-earth-600 text-sm">Planning Districts</span>
                        <span class="font-semibold text-earth-800 text-lg">${planData.total_districts}</span>
                    </div>
                    <div class="flex justify-between items-center py-2 border-b border-earth-100">
                        <span class="text-earth-600 text-sm">Planning Area</span>
                        <span class="font-semibold text-earth-800">${planData.planning_area_km2} km²</span>
                    </div>
                    <div class="py-2">
                        <span class="text-earth-600 text-sm block mb-1">Status</span>
                        <span class="font-medium ${version === '2015' ? 'text-sage-700' : 'text-amber-700'} text-sm">${planData.status}</span>
                    </div>
                    ${planData.note ? `<div class="mt-3 p-3 bg-earth-50 rounded"><p class="text-xs text-earth-600">${planData.note}</p></div>` : ''}
                </div>
            </div>

            <!-- Comparison with Other Plan -->
            <div class="bg-earth-50 p-6 border border-earth-200 rounded-lg">
                <h3 class="text-lg font-semibold text-earth-800 mb-4">Key Differences</h3>
                <div class="space-y-4">
                    <div>
                        <h4 class="text-sm font-semibold text-earth-700 mb-2">Planning Districts</h4>
                        <p class="text-sm text-earth-600">
                            <span class="font-medium">${planData.total_districts}</span> in RMP ${version} vs
                            <span class="font-medium">${otherPlanData.total_districts}</span> in RMP ${otherVersion}
                        </p>
                        <p class="text-xs text-earth-500 mt-1">
                            ${version === '2015' ? 'RMP 2015 has 5 more districts (47 vs 42) with three-ring classification system' : 'RMP 2031 consolidates into 42 districts with zone-based organization'}
                        </p>
                    </div>

                    <div>
                        <h4 class="text-sm font-semibold text-earth-700 mb-2">Numbering System</h4>
                        <p class="text-sm text-earth-600">${comparison.numbering_system[version]}</p>
                        <p class="text-xs text-earth-500 mt-1">vs ${comparison.numbering_system[otherVersion]}</p>
                    </div>

                    <div>
                        <h4 class="text-sm font-semibold text-earth-700 mb-2">Coverage Area</h4>
                        <p class="text-sm text-earth-600">${comparison.coverage[version]}</p>
                        <p class="text-xs text-earth-500 mt-1">Both plans cover the same geographic area but reorganize district boundaries</p>
                    </div>

                    <div class="pt-3 border-t border-earth-200">
                        <p class="text-xs text-earth-600">${comparison.status_difference}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- District Categories for RMP 2015 -->
        ${version === '2015' ? `
        <div class="bg-white p-6 border border-earth-200 rounded-lg mb-6">
            <h3 class="text-lg font-semibold text-earth-800 mb-4">RMP 2015 Ring Classification</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="p-4 bg-sage-50 border border-sage-200 rounded">
                    <p class="font-semibold text-sage-800 mb-1">Ring I - Core</p>
                    <p class="text-2xl font-bold text-sage-700 mb-1">${planningDistrictsData.district_categories_2015.ring_i_core.count}</p>
                    <p class="text-xs text-sage-600">Districts ${planningDistrictsData.district_categories_2015.ring_i_core.range}</p>
                    <p class="text-xs text-sage-700 mt-2">${planningDistrictsData.district_categories_2015.ring_i_core.description}</p>
                </div>
                <div class="p-4 bg-earth-50 border border-earth-200 rounded">
                    <p class="font-semibold text-earth-800 mb-1">Ring II - Intermediate</p>
                    <p class="text-2xl font-bold text-earth-700 mb-1">${planningDistrictsData.district_categories_2015.ring_ii_intermediate.count}</p>
                    <p class="text-xs text-earth-600">Districts ${planningDistrictsData.district_categories_2015.ring_ii_intermediate.range}</p>
                    <p class="text-xs text-earth-700 mt-2">${planningDistrictsData.district_categories_2015.ring_ii_intermediate.description}</p>
                </div>
                <div class="p-4 bg-amber-50 border border-amber-200 rounded">
                    <p class="font-semibold text-amber-800 mb-1">Ring III - Peripheral</p>
                    <p class="text-2xl font-bold text-amber-700 mb-1">${planningDistrictsData.district_categories_2015.ring_iii_peripheral.count}</p>
                    <p class="text-xs text-amber-600">Districts ${planningDistrictsData.district_categories_2015.ring_iii_peripheral.range}</p>
                    <p class="text-xs text-amber-700 mt-2">${planningDistrictsData.district_categories_2015.ring_iii_peripheral.description}</p>
                </div>
            </div>
        </div>
        ` : ''}

        <!-- Data Availability -->
        <div class="bg-white p-6 border border-earth-200 rounded-lg">
            <h3 class="text-lg font-semibold text-earth-800 mb-4">Data Availability for RMP ${version}</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <p class="text-sm font-medium text-earth-700 mb-1">Index Map</p>
                    <p class="text-sm text-earth-600">${planningDistrictsData.data_availability['rmp_' + version].index_map}</p>
                </div>
                <div>
                    <p class="text-sm font-medium text-earth-700 mb-1">Land Use Maps</p>
                    <p class="text-sm text-earth-600">${planningDistrictsData.data_availability['rmp_' + version].land_use_maps}</p>
                </div>
                <div>
                    <p class="text-sm font-medium text-earth-700 mb-1">GIS Data</p>
                    <p class="text-sm text-earth-600">${planningDistrictsData.data_availability['rmp_' + version].gis_data}</p>
                </div>
            </div>
            ${planningDistrictsData.data_availability['rmp_' + version].note ? `
            <div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
                <p class="text-xs text-amber-800">${planningDistrictsData.data_availability['rmp_' + version].note}</p>
            </div>
            ` : ''}
        </div>

    `;

    console.log(`Displayed Master Plan comparison for RMP ${version}`);
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
    displayMasterPlanComparison(version);
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

// Populate Economic Development Section
function populateEconomicSection() {
    if (!economicData) return;

    // Populate IT Highlights
    const itHighlights = document.getElementById('itHighlights');
    if (itHighlights && economicData.it_sector_highlights) {
        const highlights = economicData.it_sector_highlights;
        itHighlights.innerHTML = `
            <div class="bg-white p-4 rounded-lg border border-sage-200">
                <p class="text-sm text-sage-600 mb-1">Tech Workforce Milestone</p>
                <p class="font-semibold text-sage-800">${highlights.milestone}</p>
                <p class="text-xs text-sage-500 mt-1">One of 12 global powerhouse cities</p>
            </div>
            <div class="bg-white p-4 rounded-lg border border-sage-200">
                <p class="text-sm text-sage-600 mb-1">India IT Exports</p>
                <p class="text-2xl font-bold text-sage-800">${highlights.contribution_to_india_it_exports}%</p>
                <p class="text-xs text-sage-500 mt-1">Contribution to national IT exports</p>
            </div>
            <div class="bg-white p-4 rounded-lg border border-sage-200">
                <p class="text-sm text-sage-600 mb-1">Key IT Hubs</p>
                <p class="font-semibold text-sage-800">${highlights.key_hubs.length} Major Locations</p>
                <p class="text-xs text-sage-500 mt-1">${highlights.key_hubs.map(h => h.name).join(', ')}</p>
            </div>
        `;
    }

    // Populate Industrial Infrastructure
    const industrialInfra = document.getElementById('industrialInfrastructure');
    if (industrialInfra && economicData.industrial_infrastructure) {
        const infra = economicData.industrial_infrastructure;
        industrialInfra.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 class="text-sm font-semibold text-earth-700 mb-3">BDA Industrial Layouts</h4>
                    <ul class="space-y-2">
                        ${infra.industrial_layouts_bda.layouts.map(layout => `
                            <li class="text-sm text-earth-600 flex items-start">
                                <span class="text-sage-600 mr-2">→</span>
                                <div>
                                    <span class="font-medium text-earth-800">${layout.name}</span>
                                    ${layout.taluk ? `<span class="text-earth-500"> (${layout.taluk})</span>` : ''}
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-earth-700 mb-3">Master Plan Industrial Allocation</h4>
                    <div class="space-y-3">
                        <div class="p-3 bg-earth-50 rounded">
                            <p class="text-xs text-earth-500">RMP 2015</p>
                            <p class="text-lg font-bold text-earth-800">${infra.master_plan_industrial_allocation.rmp_2015.percentage}%</p>
                            <p class="text-xs text-earth-600">${infra.master_plan_industrial_allocation.rmp_2015.area_km2} km²</p>
                        </div>
                        <div class="p-3 bg-amber-50 rounded">
                            <p class="text-xs text-amber-600">RMP 2031 (Draft - Withdrawn)</p>
                            <p class="text-lg font-bold text-amber-800">${infra.master_plan_industrial_allocation.rmp_2031.percentage}%</p>
                            <p class="text-xs text-amber-700">${infra.master_plan_industrial_allocation.rmp_2031.area_km2} km²</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Create Employment Sector Chart
    const employmentChartCtx = document.getElementById('employmentSectorChart');
    if (employmentChartCtx && economicData.employment_sectors) {
        const sectors = economicData.employment_sectors.sectors;
        charts.employmentSector = new Chart(employmentChartCtx, {
            type: 'bar',
            data: {
                labels: sectors.map(s => s.name),
                datasets: [{
                    label: 'Employment Percentage',
                    data: sectors.map(s => s.percentage),
                    backgroundColor: [
                        '#7a8c5e', // sage for IT
                        '#8b6f47', // earth for construction
                        '#c85a36', // terracotta for services
                        '#5f6e49', // dark sage for manufacturing
                        '#bfa890'  // light earth for other
                    ],
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
                        max: 50,
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

// Populate E-Auction Section
function populateEAuctionSection() {
    if (!eAuctionData) return;

    // Populate Current Auction
    const currentAuction = document.getElementById('currentAuction');
    if (currentAuction && eAuctionData.current_auction) {
        const auction = eAuctionData.current_auction;
        currentAuction.innerHTML = `
            <p class="text-lg font-semibold text-terracotta-800 mb-2">${auction.title}</p>
            <p class="text-sm text-terracotta-700 mb-3">${auction.total_sites} sites available | Status: ${auction.status}</p>
            <div class="flex flex-wrap gap-3">
                <a href="${auction.document_url}" target="_blank"
                   class="inline-flex items-center px-4 py-2 bg-terracotta-600 text-white text-sm font-medium rounded-lg hover:bg-terracotta-700 transition-colors">
                    <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    View Auction Document (PDF)
                </a>
                <a href="${auction.gis_viewer_url}" target="_blank"
                   class="inline-flex items-center px-4 py-2 bg-sage-600 text-white text-sm font-medium rounded-lg hover:bg-sage-700 transition-colors">
                    <svg class="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                    </svg>
                    View GIS Map
                </a>
            </div>
        `;
    }

    // Populate Recent Acquisitions
    const recentAcq = document.getElementById('recentAcquisitions');
    if (recentAcq && eAuctionData.recent_acquisitions_2025) {
        const acq = eAuctionData.recent_acquisitions_2025;
        recentAcq.innerHTML = `
            <p class="text-sm text-earth-600 mb-4">Total area under acquisition: <span class="font-semibold text-earth-800">${acq.total_area_acres.toLocaleString()} acres</span></p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${acq.major_projects.map(project => `
                    <div class="p-4 border border-earth-200 rounded-lg hover:border-sage-400 transition-colors">
                        <p class="font-semibold text-earth-800 mb-1">${project.name}</p>
                        <p class="text-sm text-earth-600 mb-2">${project.location}</p>
                        <p class="text-xs text-earth-500">${project.description}</p>
                        ${project.area_acres ? `<p class="text-xs text-sage-600 mt-2">Area: ${project.area_acres.toLocaleString()} acres</p>` : ''}
                        <p class="text-xs text-amber-600 mt-1">Status: ${project.status}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Populate Property Management
    const propMgmt = document.getElementById('propertyManagement');
    if (propMgmt && eAuctionData.property_management) {
        const depts = eAuctionData.property_management.departments;
        propMgmt.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                ${depts.map(dept => `
                    <div class="p-4 bg-earth-50 border border-earth-200 rounded-lg">
                        <p class="font-semibold text-earth-800 mb-3">${dept.name}</p>
                        <ul class="space-y-2">
                            ${dept.key_functions.map(func => `
                                <li class="text-xs text-earth-600 flex items-start">
                                    <span class="text-sage-600 mr-1">•</span>
                                    <span>${func}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Create Land Inventory Chart
    const landChartCtx = document.getElementById('landInventoryChart');
    if (landChartCtx && eAuctionData.land_inventory_by_use) {
        const inventory = eAuctionData.land_inventory_by_use.by_category;
        charts.landInventory = new Chart(landChartCtx, {
            type: 'doughnut',
            data: {
                labels: ['Residential', 'Industrial', 'Commercial'],
                datasets: [{
                    data: [
                        inventory.residential.layouts,
                        inventory.industrial.layouts,
                        inventory.commercial.layouts
                    ],
                    backgroundColor: [earthColors.secondary, earthColors.primary, earthColors.accent],
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
}

// Populate Infrastructure Section
function populateInfrastructureSection() {
    if (!infrastructureData) return;

    // Populate Transportation Networks
    const transport = document.getElementById('transportationNetworks');
    if (transport && infrastructureData.transportation_networks) {
        const networks = infrastructureData.transportation_networks;
        transport.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 class="text-sm font-semibold text-earth-700 mb-3">Metro Rail Network</h4>
                    <div class="space-y-2">
                        <p class="text-sm text-earth-600">
                            <span class="font-medium text-earth-800">${networks.metro_rail.operational_lines}</span> operational lines,
                            <span class="font-medium text-earth-800">${networks.metro_rail.under_construction}</span> under construction,
                            <span class="font-medium text-earth-800">${networks.metro_rail.proposed_lines}</span> proposed
                        </p>
                        <p class="text-sm text-earth-600">
                            <span class="font-medium text-earth-800">${networks.metro_rail.total_stations}</span> total stations
                        </p>
                        <p class="text-xs text-sage-600 mt-2">
                            Coverage: ${networks.metro_rail.coverage_1km} within 1km, ${networks.metro_rail.coverage_2km} within 2km
                        </p>
                    </div>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-earth-700 mb-3">Road Network</h4>
                    <ul class="space-y-2">
                        ${networks.road_network.major_projects.map(project => `
                            <li class="text-sm text-earth-600">
                                <span class="font-medium text-earth-800">${project.name}</span>
                                <span class="text-xs text-sage-600 ml-2">(${project.status})</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    // Populate Utilities Infrastructure
    const utilities = document.getElementById('utilitiesInfrastructure');
    if (utilities && infrastructureData.water_infrastructure) {
        utilities.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <h4 class="text-sm font-semibold text-earth-700 mb-3">Water Supply</h4>
                    <p class="text-xs text-earth-600 mb-2">Authority: <span class="font-medium text-earth-800">${infrastructureData.water_infrastructure.water_supply_authority}</span></p>
                    <p class="text-xs text-earth-500">${infrastructureData.water_infrastructure.major_sources.join(', ')}</p>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-earth-700 mb-3">Sewage Treatment</h4>
                    <p class="text-xs text-earth-600 mb-2">STPs: <span class="font-medium text-earth-800">${infrastructureData.sewage_infrastructure.treatment_plants.length}</span></p>
                    <p class="text-xs text-earth-500">Network: ${infrastructureData.sewage_infrastructure.underground_network.works_count} works</p>
                </div>
                <div>
                    <h4 class="text-sm font-semibold text-earth-700 mb-3">Water Bodies</h4>
                    <p class="text-xs text-earth-600 mb-2">Lakes (BDA): <span class="font-medium text-earth-800">${infrastructureData.water_bodies.total_lakes_bda_jurisdiction}</span></p>
                    <p class="text-xs text-earth-500">Rivers: ${infrastructureData.drainage_systems.rivers.length} monitored</p>
                </div>
            </div>
        `;
    }

    // Populate Layout Infrastructure Requirements
    const layoutInfra = document.getElementById('layoutInfrastructure');
    if (layoutInfra && infrastructureData.layout_infrastructure_requirements) {
        const reqs = infrastructureData.layout_infrastructure_requirements.mandatory_provisions;
        layoutInfra.innerHTML = `
            <p class="text-sm text-earth-600 mb-4">All BDA layouts must comply with mandatory infrastructure provisions:</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${Object.entries(reqs).map(([key, value]) => `
                    <div class="flex items-start space-x-3">
                        <svg class="h-5 w-5 text-sage-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <div>
                            <p class="text-sm font-medium text-earth-800">${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                            <p class="text-xs text-earth-600">${value.description || value.requirement}</p>
                            ${value.percentage ? `<p class="text-xs text-sage-600 mt-1">${value.percentage}% reservation</p>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// ============================================================================
// Revenue section (demo v1 — localStorage-backed)
// ============================================================================

let revenueMap = null;
let revenueGeoJson = null;
let revenueGeoLayer = null;
let revenueActiveTab = 'overview';
let revenueSparklines = {};
let revenueInitialised = false;
let revenueBucketColors = {
    veryLow: '#c85a36',   // terracotta-500
    low:     '#e8a692',   // terracotta-300
    mid:     '#bfa890',   // earth-300
    high:    '#b4bfa3',   // sage-300
    full:    '#7a8c5e',   // sage-500
    none:    '#e8e3dc'    // earth-100
};

async function loadRevenueData() {
    try {
        await window.revenueStore.init();
        document.addEventListener('revenue:changed', renderRevenue);
        wireRevenueOnce();
        renderRevenue();
        console.log('Loaded revenue store');
    } catch (err) {
        console.error('Error loading revenue data:', err);
    }
}

function wireRevenueOnce() {
    if (revenueInitialised) return;
    revenueInitialised = true;

    document.querySelectorAll('[data-revenue-tab]').forEach(btn => {
        btn.addEventListener('click', () => showRevenueTab(btn.dataset.revenueTab));
    });

    document.getElementById('revenueZoneFilter')?.addEventListener('change', renderRevenue);
    document.getElementById('revenueOfficerSearch')?.addEventListener('input', renderRevenue);

    document.getElementById('revenueOfficerSwitcher')?.addEventListener('change', e => {
        window.revenueStore.setCurrentOfficer(e.target.value || null);
    });

    document.getElementById('revenueResetBtn')?.addEventListener('click', () => {
        if (confirm('Reset demo data? All entries you added will be lost.')) {
            window.revenueStore.reset();
        }
    });

    document.getElementById('revenueAddCdBtn')?.addEventListener('click', openCdModal);
    document.querySelectorAll('[data-revenue-modal-close]').forEach(el => {
        el.addEventListener('click', () => closeModal(el.dataset.revenueModalClose));
    });

    document.getElementById('revenueCdForm')?.addEventListener('input', updateCdDerived);
    document.getElementById('revenueCdForm')?.addEventListener('submit', submitCdForm);
    document.getElementById('revenueWeeklyForm')?.addEventListener('submit', submitWeeklyForm);

    const thresholdInput = document.getElementById('revenueThresholdInput');
    if (thresholdInput) {
        const initial = window.revenueStore.getState()?.offTrackThreshold;
        if (typeof initial === 'number') thresholdInput.value = initial;
        thresholdInput.addEventListener('change', e => {
            window.revenueStore.setOffTrackThreshold(e.target.value);
        });
    }

    document.getElementById('revenueReminderCopyBtn')?.addEventListener('click', copyReminderMessage);
}

function onRevenueSectionShown() {
    if (revenueActiveTab === 'map') {
        ensureRevenueMap();
        if (revenueMap) revenueMap.invalidateSize();
    }
}

function showRevenueTab(name) {
    revenueActiveTab = name;
    document.querySelectorAll('.revenue-tab').forEach(btn => {
        const active = btn.dataset.revenueTab === name;
        btn.classList.toggle('border-earth-700', active);
        btn.classList.toggle('text-earth-800', active);
        btn.classList.toggle('border-transparent', !active);
        btn.classList.toggle('text-earth-600', !active);
    });
    document.querySelectorAll('.revenue-panel').forEach(panel => {
        panel.classList.toggle('hidden', panel.dataset.revenuePanel !== name);
    });
    if (name === 'map') {
        ensureRevenueMap();
        setTimeout(() => revenueMap && revenueMap.invalidateSize(), 50);
    }
}

function getRevenueFilter() {
    const zone = document.getElementById('revenueZoneFilter')?.value || '';
    const q = (document.getElementById('revenueOfficerSearch')?.value || '').trim().toLowerCase();
    return { zone, q };
}

function officerMatches(o, f) {
    if (f.zone && o.zone !== f.zone) return false;
    if (f.q && !(`${o.name} ${o.designation}`.toLowerCase().includes(f.q))) return false;
    return true;
}

function renderRevenue() {
    const state = window.revenueStore.getState();
    if (!state) return;
    populateZoneFilter(state);
    populateOfficerSwitcher(state);
    const f = getRevenueFilter();
    const filteredOfficers = state.officers.filter(o => officerMatches(o, f));
    const filteredParcels = state.cdParcels.filter(p => !f.zone || p.zone === f.zone);
    renderRevenueKpis(filteredOfficers, filteredParcels, state);
    renderRevenueOverview(filteredOfficers);
    renderRevenueProgress(filteredOfficers, state);
    renderRevenueActionPlan(filteredOfficers, state);
    renderRevenueCdParcels(filteredParcels);
    renderRevenueTrends(filteredOfficers, state);
    if (revenueMap) styleRevenuePolygons(state);
    refreshAddCdButton(state);
    const thresholdInput = document.getElementById('revenueThresholdInput');
    if (thresholdInput && document.activeElement !== thresholdInput && Number(thresholdInput.value) !== state.offTrackThreshold) {
        thresholdInput.value = state.offTrackThreshold;
    }
}

function populateZoneFilter(state) {
    const sel = document.getElementById('revenueZoneFilter');
    if (!sel || sel.options.length > 1) return;
    state.zones.forEach(z => {
        const opt = document.createElement('option');
        opt.value = z;
        opt.textContent = z;
        sel.appendChild(opt);
    });
}

function populateOfficerSwitcher(state) {
    const sel = document.getElementById('revenueOfficerSwitcher');
    if (!sel) return;
    const desired = state.currentOfficerId || '';
    if (sel.options.length <= 1) {
        const grouped = {};
        state.officers.forEach(o => {
            if (!grouped[o.zone]) grouped[o.zone] = [];
            grouped[o.zone].push(o);
        });
        Object.entries(grouped).sort().forEach(([zone, list]) => {
            const og = document.createElement('optgroup');
            og.label = zone;
            list.forEach(o => {
                const opt = document.createElement('option');
                opt.value = o.id;
                opt.textContent = `${o.name} · ${o.designation}`;
                og.appendChild(opt);
            });
            sel.appendChild(og);
        });
    }
    if (sel.value !== desired) sel.value = desired;
}

function renderRevenueKpis(officers, parcels, state) {
    const totalTarget = officers.reduce((a, o) => a + (o.totalTargetCr || 0), 0);
    const achieved = officers.reduce((a, o) => a + (o.cumulative.financial || 0), 0);
    const pct = totalTarget > 0 ? (achieved / totalTarget) * 100 : 0;
    const offTrack = officers.filter(o => window.revenueStore.getOffTrackInfo(o).isOff).length;
    setKpi('totalTarget', `₹ ${totalTarget.toFixed(2)} Cr`);
    setKpi('achieved', `₹ ${achieved.toFixed(2)} Cr`);
    setKpi('pct', `${pct.toFixed(1)}%`);
    setKpi('cdCount', String(parcels.length));
    const officersEl = document.querySelector('[data-kpi="activeOfficers"]');
    if (officersEl) officersEl.innerHTML = `${officers.length} <span class="text-base font-medium text-terracotta-600">· ${offTrack} off track</span>`;
}

function setKpi(key, text) {
    const el = document.querySelector(`[data-kpi="${key}"]`);
    if (el) el.textContent = text;
}

function renderRevenueOverview(officers) {
    const zoneCards = document.getElementById('revenueZoneCards');
    if (zoneCards) {
        const byZone = {};
        officers.forEach(o => {
            const z = byZone[o.zone] || (byZone[o.zone] = { target: 0, achieved: 0, count: 0 });
            z.target += o.totalTargetCr || 0;
            z.achieved += o.cumulative.financial || 0;
            z.count += 1;
        });
        zoneCards.innerHTML = Object.entries(byZone).map(([zone, z]) => {
            const pct = z.target > 0 ? (z.achieved / z.target) * 100 : 0;
            const barColor = pct >= 75 ? 'bg-sage-500' : pct >= 25 ? 'bg-earth-400' : 'bg-terracotta-400';
            return `
                <div class="border border-earth-100 rounded-lg p-3">
                    <div class="flex justify-between items-center mb-1.5">
                        <span class="text-sm font-medium text-earth-800">${zone}</span>
                        <span class="text-xs text-earth-600">${z.count} officer${z.count === 1 ? '' : 's'} · ₹${z.achieved.toFixed(2)} / ₹${z.target.toFixed(2)} Cr</span>
                    </div>
                    <div class="w-full bg-earth-100 rounded-full h-2 overflow-hidden">
                        <div class="h-2 ${barColor}" style="width:${Math.min(100, pct).toFixed(1)}%"></div>
                    </div>
                </div>`;
        }).join('') || '<p class="text-sm text-earth-500">No data for the selected filter.</p>';
    }

    const lbCtx = document.getElementById('revenueLeaderboardChart');
    if (lbCtx) {
        const top = [...officers]
            .filter(o => (o.totalTargetCr || 0) > 0)
            .map(o => ({ name: o.name, pct: o.totalTargetCr ? ((o.cumulative.financial || 0) / o.totalTargetCr) * 100 : 0 }))
            .sort((a, b) => b.pct - a.pct)
            .slice(0, 10);
        if (charts.revenueLeaderboard) charts.revenueLeaderboard.destroy();
        charts.revenueLeaderboard = new Chart(lbCtx, {
            type: 'bar',
            data: {
                labels: top.map(t => t.name),
                datasets: [{
                    label: '% achieved',
                    data: top.map(t => Number(t.pct.toFixed(2))),
                    backgroundColor: earthColors.primary,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: earthColors.primary, callback: v => `${v}%` }, grid: { color: earthColors.light } },
                    y: { ticks: { color: earthColors.primary, autoSkip: false }, grid: { display: false } }
                }
            }
        });
    }
}

function renderRevenueProgress(officers, state) {
    const tbody = document.getElementById('revenueProgressBody');
    if (!tbody) return;
    if (!officers.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="px-4 py-6 text-center text-sm text-earth-500">No officers match the current filter.</td></tr>';
        return;
    }
    Object.values(revenueSparklines).forEach(c => c.destroy());
    revenueSparklines = {};
    const isAdmin = !state.currentOfficerId;
    // Sort by % achieved descending so the table doubles as a leaderboard.
    // Officers without a target sink to the bottom (pct = -1 sentinel).
    const ranked = [...officers].map(o => ({
        o,
        pct: o.totalTargetCr ? ((o.cumulative.financial || 0) / o.totalTargetCr) * 100 : -1
    })).sort((a, b) => b.pct - a.pct);
    const rankStyles = {
        1: 'bg-earth-500 text-white',
        2: 'bg-sage-500 text-white',
        3: 'bg-terracotta-500 text-white'
    };
    tbody.innerHTML = ranked.map(({ o, pct: rawPct }, idx) => {
        const rank = idx + 1;
        const pct = Math.max(0, rawPct);
        const pctClass = pct >= 75 ? 'text-sage-700' : pct >= 25 ? 'text-earth-700' : 'text-terracotta-700';
        const canEdit = state.currentOfficerId === o.id;
        const off = window.revenueStore.getOffTrackInfo(o);
        const badge = off.isOff ? `<span class="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-terracotta-100 text-terracotta-700 align-middle">OFF TRACK</span>` : '';
        const remindBtn = isAdmin && off.isOff ? `<button class="text-xs px-2 py-1 bg-sage-600 text-white rounded hover:bg-sage-700" data-remind-officer="${o.id}">Send reminder</button>` : '';
        const logBtn = canEdit ? `<button class="text-xs px-2 py-1 bg-earth-700 text-white rounded hover:bg-earth-800 ml-1" data-log-officer="${o.id}">Log week</button>` : '';
        const rankChip = rankStyles[rank]
            ? `<span class="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${rankStyles[rank]}">${rank}</span>`
            : `<span class="text-xs font-medium text-earth-500">#${rank}</span>`;
        const rowHighlight = rank <= 3 ? 'bg-earth-50/40' : '';
        return `
            <tr data-officer-id="${o.id}" class="${rowHighlight}">
                <td class="px-3 py-3 text-center">${rankChip}</td>
                <td class="px-4 py-3 text-earth-900 font-medium">${escapeHtml(o.name)}${badge}</td>
                <td class="px-4 py-3 text-earth-700">${escapeHtml(o.designation || '')}</td>
                <td class="px-4 py-3 text-earth-700">${o.zone}</td>
                <td class="px-4 py-3 text-right text-earth-800">${(o.totalTargetCr || 0).toFixed(2)}</td>
                <td class="px-4 py-3 text-right text-earth-800">${(o.cumulative.financial || 0).toFixed(2)}</td>
                <td class="px-4 py-3 text-right font-semibold ${pctClass}">${rawPct < 0 ? '<span class="text-earth-400">—</span>' : pct.toFixed(1) + '%'}</td>
                <td class="px-4 py-3"><canvas class="revenue-sparkline" data-officer-id="${o.id}"></canvas></td>
                <td class="px-4 py-3 text-right whitespace-nowrap">${remindBtn}${logBtn}</td>
            </tr>`;
    }).join('');
    tbody.querySelectorAll('[data-log-officer]').forEach(btn => {
        btn.addEventListener('click', () => openWeeklyModal(btn.dataset.logOfficer));
    });
    tbody.querySelectorAll('[data-remind-officer]').forEach(btn => {
        btn.addEventListener('click', () => openReminderModal(btn.dataset.remindOfficer));
    });
    // Render sparklines (weekly action plan + cumulative actuals overlay)
    requestAnimationFrame(() => {
        officers.forEach(o => {
            const canvas = tbody.querySelector(`canvas[data-officer-id="${o.id}"]`);
            if (!canvas) return;
            const plan = state.actionPlan.find(ap => ap.officerId === o.id);
            const weeks = plan ? plan.weeks.slice(0, 12) : [];
            const data = weeks.map(w => w.target || 0);
            revenueSparklines[o.id] = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: weeks.map(w => w.week),
                    datasets: [{
                        data,
                        borderColor: earthColors.secondary,
                        backgroundColor: 'rgba(122,140,94,0.15)',
                        borderWidth: 1.5,
                        pointRadius: 0,
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    scales: { x: { display: false }, y: { display: false } }
                }
            });
        });
    });
}

function renderRevenueActionPlan(officers, state) {
    const head = document.getElementById('revenueActionHead');
    const body = document.getElementById('revenueActionBody');
    if (!head || !body) return;
    const ref = state.actionPlan.find(ap => ap.weeks && ap.weeks.length);
    const weeks = ref ? ref.weeks : [];
    const isAdmin = !state.currentOfficerId;
    head.innerHTML = '<th class="px-3 py-2 text-left sticky left-0 bg-earth-50 z-10 border-r border-earth-200">Officer</th>'
        + weeks.map(w => `<th class="px-3 py-2 text-right text-earth-700 whitespace-nowrap">${escapeHtml(w.week)}<div class="text-[10px] font-normal text-earth-500">${w.from || ''}</div></th>`).join('');
    const rows = officers.map(o => {
        const plan = state.actionPlan.find(ap => ap.officerId === o.id);
        const cells = weeks.map((_, i) => {
            const t = plan?.weeks[i]?.target;
            const display = t != null ? Number(t).toFixed(2) : '';
            if (isAdmin && plan) {
                return `<td class="px-1 py-1 text-right">
                    <input type="number" step="0.01" min="0"
                           class="w-20 px-1.5 py-1 text-right text-earth-800 text-xs border border-transparent rounded hover:border-earth-200 focus:border-earth-500 focus:outline-none focus:bg-earth-50"
                           value="${display}" placeholder="—"
                           data-edit-target="${o.id}" data-edit-week="${i}">
                </td>`;
            }
            return `<td class="px-3 py-2 text-right text-earth-800">${display || '<span class="text-earth-300">·</span>'}</td>`;
        }).join('');
        return `<tr>
            <td class="px-3 py-2 sticky left-0 bg-white border-r border-earth-200 font-medium text-earth-800 whitespace-nowrap">${escapeHtml(o.name)}<div class="text-[10px] font-normal text-earth-500">${escapeHtml(o.designation || '')} · ${o.zone}</div></td>
            ${cells}
        </tr>`;
    }).join('');
    body.innerHTML = rows || '<tr><td class="px-3 py-6 text-center text-sm text-earth-500">No officers in current filter.</td></tr>';
    if (isAdmin) {
        body.querySelectorAll('[data-edit-target]').forEach(inp => {
            inp.addEventListener('change', e => {
                const id = e.target.dataset.editTarget;
                const wk = Number(e.target.dataset.editWeek);
                window.revenueStore.setWeeklyTarget(id, wk, e.target.value === '' ? null : e.target.value);
            });
        });
    }
}

function renderRevenueCdParcels(parcels) {
    const body = document.getElementById('revenueCdBody');
    const totalEl = document.getElementById('revenueCdTotal');
    if (!body) return;
    if (!parcels.length) {
        body.innerHTML = '<tr><td colspan="11" class="px-3 py-6 text-center text-sm text-earth-500">No CD parcels submitted yet. Sign in as an officer and click <span class="font-semibold">+ Add CD parcel</span> to start.</td></tr>';
    } else {
        body.innerHTML = parcels.map(p => `
            <tr data-cd-id="${p.id}" data-zone="${p.zone}" class="hover:bg-earth-50 cursor-pointer">
                <td class="px-3 py-2 text-earth-700">${p.dateSubmitted || ''}</td>
                <td class="px-3 py-2 text-earth-900 font-medium">${escapeHtml(p.aeName || '')}</td>
                <td class="px-3 py-2 text-earth-700">${p.zone}</td>
                <td class="px-3 py-2 text-earth-700">${escapeHtml(p.layout || '')}</td>
                <td class="px-3 py-2 text-earth-700">${escapeHtml(p.block || '')}</td>
                <td class="px-3 py-2 text-earth-700">${escapeHtml(p.village || '')}</td>
                <td class="px-3 py-2 text-earth-700">${escapeHtml(p.surveyNo || '')}</td>
                <td class="px-3 py-2 text-earth-700">${escapeHtml(p.siteNo || '')}</td>
                <td class="px-3 py-2 text-right text-earth-800">${p.areaSqm != null ? p.areaSqm.toFixed(2) : ''}</td>
                <td class="px-3 py-2 text-right text-earth-800">${p.ratePerSqmGuidance != null ? formatINR(p.ratePerSqmGuidance) : ''}</td>
                <td class="px-3 py-2 text-right font-semibold text-earth-900">${p.totalAmount != null ? formatINR(p.totalAmount) : ''}</td>
            </tr>`).join('');
        body.querySelectorAll('tr[data-cd-id]').forEach(tr => {
            tr.addEventListener('click', () => focusZoneOnMap(tr.dataset.zone));
        });
    }
    const total = parcels.reduce((a, p) => a + (p.totalAmount || 0), 0);
    if (totalEl) totalEl.textContent = `₹ ${formatINR(total)}`;
}

function refreshAddCdButton(state) {
    const btn = document.getElementById('revenueAddCdBtn');
    if (!btn) return;
    const isOfficer = !!state.currentOfficerId;
    btn.disabled = !isOfficer;
    btn.title = isOfficer ? '' : 'Switch to an officer (top-right) to add a parcel';
}

// --- Trends + reminders ------------------------------------------------------
function renderRevenueTrends(officers, state) {
    const asOfEl = document.getElementById('revenueTrendsAsOf');
    const today = new Date();
    if (asOfEl) asOfEl.textContent = `As of ${today.toISOString().slice(0, 10)}`;

    // Aggregate cumulative target plan across the filtered officer set, by week index.
    const refPlan = state.actionPlan.find(ap => ap.weeks && ap.weeks.length);
    const weeks = refPlan ? refPlan.weeks : [];
    const cumTargetByWeek = new Array(weeks.length).fill(0);
    officers.forEach(o => {
        const plan = state.actionPlan.find(ap => ap.officerId === o.id);
        if (!plan) return;
        let running = 0;
        plan.weeks.forEach((w, i) => {
            running += Number(w.target) || 0;
            cumTargetByWeek[i] += running;
        });
    });

    // Current-week index = last completed week relative to today
    let nowWeekIdx = -1;
    for (let i = 0; i < weeks.length; i++) {
        const ref = weeks[i].to || weeks[i].from;
        if (ref && new Date(ref) <= today) nowWeekIdx = i;
        else break;
    }
    const totalAchieved = officers.reduce((a, o) => a + (o.cumulative.financial || 0), 0);
    const achievedData = weeks.map((_, i) => i === nowWeekIdx ? totalAchieved : null);

    const ctx = document.getElementById('revenueTrendsChart');
    if (ctx) {
        if (charts.revenueTrends) charts.revenueTrends.destroy();
        charts.revenueTrends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: weeks.map(w => w.week),
                datasets: [
                    {
                        label: 'Cumulative planned target (₹ Cr)',
                        data: cumTargetByWeek,
                        borderColor: earthColors.primary,
                        backgroundColor: 'rgba(139,111,71,0.10)',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.25,
                        fill: true
                    },
                    {
                        label: 'Cumulative achieved (₹ Cr)',
                        data: achievedData,
                        borderColor: earthColors.accent,
                        backgroundColor: earthColors.accent,
                        borderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        spanGaps: false,
                        showLine: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', labels: { color: earthColors.primary, boxWidth: 12 } },
                    tooltip: {
                        callbacks: {
                            label: (item) => `${item.dataset.label}: ₹ ${Number(item.parsed.y).toFixed(2)} Cr`,
                            title: (items) => {
                                const i = items[0].dataIndex;
                                const w = weeks[i];
                                return w ? `${w.week}  (${w.from || ''} → ${w.to || ''})` : '';
                            }
                        }
                    }
                },
                scales: {
                    y: { ticks: { color: earthColors.primary, callback: v => `₹${v}` }, grid: { color: earthColors.light } },
                    x: { ticks: { color: earthColors.primary, maxRotation: 0, autoSkip: true, maxTicksLimit: 14 }, grid: { display: false } }
                }
            }
        });
    }

    // Off-track list
    const list = document.getElementById('revenueOffTrackList');
    const countEl = document.getElementById('revenueOffTrackCount');
    const helpEl = document.getElementById('revenueOffTrackHelp');
    if (helpEl) helpEl.textContent = `Below ${state.offTrackThreshold}% of cumulative plan-to-date.`;
    if (!list) return;
    const offTrack = officers
        .map(o => ({ o, info: window.revenueStore.getOffTrackInfo(o) }))
        .filter(x => x.info.isOff)
        .sort((a, b) => (a.info.pct ?? 0) - (b.info.pct ?? 0));
    if (countEl) countEl.textContent = String(offTrack.length);
    if (!offTrack.length) {
        list.innerHTML = '<p class="text-xs text-sage-700">Everyone is on track. ✓</p>';
        return;
    }
    list.innerHTML = offTrack.map(({ o, info }) => `
        <div class="border border-earth-100 rounded-lg p-3 flex items-start justify-between gap-3">
            <div class="min-w-0">
                <div class="text-sm font-medium text-earth-900 truncate">${escapeHtml(o.name)}</div>
                <div class="text-[11px] text-earth-600 truncate">${escapeHtml(o.designation || '')} · ${o.zone}</div>
                <div class="text-[11px] mt-1 text-terracotta-700">
                    ₹${info.achieved.toFixed(2)} / ₹${info.expected.toFixed(2)} Cr (${info.pct == null ? '—' : info.pct.toFixed(0)}%)
                </div>
            </div>
            <button class="text-xs px-2 py-1 bg-sage-600 text-white rounded hover:bg-sage-700 shrink-0" data-remind-officer="${o.id}">Remind</button>
        </div>
    `).join('');
    list.querySelectorAll('[data-remind-officer]').forEach(btn => {
        btn.addEventListener('click', () => openReminderModal(btn.dataset.remindOfficer));
    });
}

function buildReminderMessage(officer, info) {
    const today = new Date().toISOString().slice(0, 10);
    const expected = info.expected.toFixed(2);
    const achieved = info.achieved.toFixed(2);
    const pct = info.pct == null ? '—' : info.pct.toFixed(0);
    const gap = Math.max(0, info.expected - info.achieved).toFixed(2);
    return `Hello ${officer.name},

This is a reminder regarding your revenue mobilisation targets for FY 2026–27.

As of ${today}, your cumulative target plan-to-date is ₹ ${expected} Cr, but achievement stands at ₹ ${achieved} Cr (${pct}% of plan). The current gap is ₹ ${gap} Cr.

Please prioritise:
• Submitting pending CD parcels to FM section
• Updating your weekly progress in the BDA dashboard
• Reaching out to your zonal commissioner for support if needed

— BDA Revenue Office`;
}

function openReminderModal(officerId) {
    const state = window.revenueStore.getState();
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer) return;
    const info = window.revenueStore.getOffTrackInfo(officer);
    const message = buildReminderMessage(officer, info);
    document.getElementById('revenueReminderOfficerLabel').textContent =
        `To: ${officer.name} · ${officer.designation || ''} · ${officer.zone}`;
    const body = document.getElementById('revenueReminderBody');
    if (body) body.textContent = message;
    document.getElementById('revenueReminderCopyBtn').dataset.message = message;
    document.getElementById('revenueReminderModal').classList.remove('hidden');
}

function copyReminderMessage(e) {
    const msg = e.currentTarget.dataset.message || '';
    if (!msg) return;
    const fallback = () => {
        const ta = document.createElement('textarea');
        ta.value = msg;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (_) {}
        document.body.removeChild(ta);
    };
    const finish = () => {
        const btn = e.currentTarget;
        const orig = btn.textContent;
        btn.textContent = 'Copied ✓';
        setTimeout(() => { btn.textContent = orig; }, 1500);
    };
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(msg).then(finish).catch(() => { fallback(); finish(); });
    } else {
        fallback();
        finish();
    }
}

// --- Map ---------------------------------------------------------------------
function ensureRevenueMap() {
    if (revenueMap) return;
    const el = document.getElementById('revenueMap');
    if (!el) return;
    revenueMap = L.map('revenueMap').setView([12.9716, 77.5946], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(revenueMap);
    fetch('data/bda-jurisdiction.geojson')
        .then(r => r.json())
        .then(gj => {
            revenueGeoJson = gj;
            const state = window.revenueStore.getState();
            drawRevenuePolygons(state);
        })
        .catch(err => console.error('Error loading revenue geojson:', err));
}

function drawRevenuePolygons(state) {
    if (!revenueMap || !revenueGeoJson) return;
    if (revenueGeoLayer) revenueGeoLayer.remove();
    revenueGeoLayer = L.geoJSON(revenueGeoJson, {
        style: feature => polygonStyle(feature, state),
        onEachFeature: (feature, layer) => {
            layer.bindPopup(buildPolygonPopup(feature, state));
        }
    }).addTo(revenueMap);
    try {
        revenueMap.fitBounds(revenueGeoLayer.getBounds(), { padding: [20, 20] });
    } catch (_) { /* empty geometry */ }
}

function styleRevenuePolygons(state) {
    if (!revenueGeoLayer) return;
    revenueGeoLayer.eachLayer(layer => {
        const f = layer.feature;
        layer.setStyle(polygonStyle(f, state));
        layer.setPopupContent(buildPolygonPopup(f, state));
    });
}

function polygonStyle(feature, state) {
    const officer = feature.properties.officerId
        ? state.officers.find(o => o.id === feature.properties.officerId)
        : null;
    const pct = officer && officer.totalTargetCr
        ? ((officer.cumulative.financial || 0) / officer.totalTargetCr) * 100
        : null;
    let fill = revenueBucketColors.none;
    if (pct != null) {
        if (pct >= 100) fill = revenueBucketColors.full;
        else if (pct >= 75) fill = revenueBucketColors.high;
        else if (pct >= 50) fill = revenueBucketColors.mid;
        else if (pct >= 25) fill = revenueBucketColors.low;
        else fill = revenueBucketColors.veryLow;
    }
    return { color: earthColors.dark, weight: 1, fillColor: fill, fillOpacity: 0.65, opacity: 0.6 };
}

function buildPolygonPopup(feature, state) {
    const p = feature.properties;
    const officer = p.officerId ? state.officers.find(o => o.id === p.officerId) : null;
    if (officer) {
        const pct = officer.totalTargetCr ? ((officer.cumulative.financial || 0) / officer.totalTargetCr) * 100 : 0;
        return `
            <div class="p-1 min-w-[200px]">
                <div class="text-xs text-earth-500 uppercase tracking-wide">${escapeHtml(p.name || '')}</div>
                <div class="font-semibold text-earth-900">${escapeHtml(officer.name)}</div>
                <div class="text-xs text-earth-600">${escapeHtml(officer.designation || '')} · ${officer.zone}</div>
                <div class="mt-2 text-xs space-y-0.5">
                    <div>Target: <span class="font-medium">₹ ${(officer.totalTargetCr || 0).toFixed(2)} Cr</span></div>
                    <div>Achieved: <span class="font-medium">₹ ${(officer.cumulative.financial || 0).toFixed(2)} Cr</span></div>
                    <div>Achievement: <span class="font-semibold">${pct.toFixed(1)}%</span></div>
                </div>
            </div>`;
    }
    return `
        <div class="p-1">
            <div class="text-xs text-earth-500 uppercase tracking-wide">${escapeHtml(p.name || '')}</div>
            <div class="font-semibold text-earth-900">Unassigned</div>
            <div class="text-xs text-earth-600 mt-1">AE: ${escapeHtml(p.aeName || '—')}</div>
            <div class="text-xs text-earth-600">AEE: ${escapeHtml(p.aeeName || '—')}</div>
        </div>`;
}

function focusZoneOnMap(zone) {
    showRevenueTab('map');
    if (!revenueGeoLayer) return;
    const bounds = L.latLngBounds([]);
    let found = 0;
    revenueGeoLayer.eachLayer(layer => {
        if (layer.feature.properties.officerZone === zone) {
            bounds.extend(layer.getBounds());
            found++;
        }
    });
    if (found > 0) revenueMap.fitBounds(bounds, { padding: [20, 20] });
}

// --- Modals ------------------------------------------------------------------
function openCdModal() {
    const state = window.revenueStore.getState();
    if (!state.currentOfficerId) return;
    const officer = state.officers.find(o => o.id === state.currentOfficerId);
    if (!officer) return;
    document.getElementById('revenueCdOfficerLabel').textContent =
        `As ${officer.name} · ${officer.designation || ''} · ${officer.zone}`;
    const form = document.getElementById('revenueCdForm');
    form.reset();
    form.dataset.officerId = officer.id;
    form.dataset.officerName = officer.name;
    form.dataset.zone = officer.zone;
    const today = new Date().toISOString().slice(0, 10);
    form.querySelector('[name="dateSubmitted"]').value = today;
    updateCdDerived();
    setModalError('cd', '');
    document.getElementById('revenueCdModal').classList.remove('hidden');
}

function updateCdDerived() {
    const form = document.getElementById('revenueCdForm');
    if (!form) return;
    const ew = parseFloat(form.querySelector('[name="ewFeet"]').value) || 0;
    const ns = parseFloat(form.querySelector('[name="nsFeet"]').value) || 0;
    const rate = parseFloat(form.querySelector('[name="ratePerSqmGuidance"]').value) || 0;
    const area = ew * ns * 0.092903;
    const amount = area * rate;
    form.querySelector('[data-cd-derived="area"]').textContent = area > 0 ? `${area.toFixed(2)} sq m` : '— sq m';
    form.querySelector('[data-cd-derived="amount"]').textContent = amount > 0 ? `₹ ${formatINR(amount)}` : '₹ —';
}

function submitCdForm(e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    const ew = parseFloat(data.ewFeet) || 0;
    const ns = parseFloat(data.nsFeet) || 0;
    const rateG = parseFloat(data.ratePerSqmGuidance) || 0;
    if (ew <= 0 || ns <= 0) return setModalError('cd', 'E–W and N–S dimensions are required.');
    if (rateG <= 0) return setModalError('cd', 'Guidance rate is required.');
    const areaSqm = Number((ew * ns * 0.092903).toFixed(2));
    const totalAmount = Number((areaSqm * rateG).toFixed(2));
    window.revenueStore.addCdParcel({
        zone: form.dataset.zone,
        aeName: form.dataset.officerName,
        designation: window.revenueStore.getState().officers.find(o => o.id === form.dataset.officerId)?.designation || null,
        dateSubmitted: data.dateSubmitted,
        layout: data.layout || null,
        block: data.block || null,
        village: data.village || null,
        surveyNo: data.surveyNo || null,
        siteNo: data.siteNo || null,
        ewFeet: ew,
        nsFeet: ns,
        areaSqm,
        ratePerSqmMin: parseFloat(data.ratePerSqmMin) || null,
        ratePerSqmGuidance: rateG,
        totalAmount,
        remarks: null
    });
    closeModal('cd');
    showRevenueTab('cd-parcels');
}

function openWeeklyModal(officerId) {
    const state = window.revenueStore.getState();
    const officer = state.officers.find(o => o.id === officerId);
    if (!officer) return;
    const form = document.getElementById('revenueWeeklyForm');
    form.reset();
    form.dataset.officerId = officerId;
    document.getElementById('revenueWeeklyOfficerLabel').textContent =
        `${officer.name} · ${officer.designation || ''} · ${officer.zone}`;
    setModalError('weekly', '');
    document.getElementById('revenueWeeklyModal').classList.remove('hidden');
}

function submitWeeklyForm(e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    const v = parseFloat(data.financialCr);
    if (!(v >= 0)) return setModalError('weekly', 'Enter a valid amount (≥ 0).');
    window.revenueStore.recordWeeklyProgress(form.dataset.officerId, v);
    closeModal('weekly');
}

function closeModal(name) {
    const ids = { cd: 'revenueCdModal', weekly: 'revenueWeeklyModal', reminder: 'revenueReminderModal' };
    const id = ids[name];
    if (id) document.getElementById(id)?.classList.add('hidden');
}

function setModalError(name, text) {
    const sel = name === 'cd' ? '[data-revenue-cd-error]' : '[data-revenue-weekly-error]';
    const el = document.querySelector(sel);
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('hidden', !text);
}

// --- Helpers -----------------------------------------------------------------
function escapeHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatINR(n) {
    if (n == null || !Number.isFinite(n)) return '';
    return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// Make functions globally available
window.showSection = showSection;
window.togglePlan = togglePlan;
window.exportLayouts = exportLayouts;
window.exportSources = exportSources;
window.toggleDropdown = toggleDropdown;
window.handleCategoryClick = handleCategoryClick;
window.toggleMobileCategory = toggleMobileCategory;
