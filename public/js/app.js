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
let economicData = null;
let eAuctionData = null;
let infrastructureData = null;
let currentPlanVersion = '2015';
let layoutsMap; // Layouts map
let charts = {};
let layoutLayers = [];
let adminBoundaryLayers = [];

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
    initializeCharts();
    initializeMap();
    setupEventListeners();
    setupMobileMenu();
    showSection('overview');

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

// Make functions globally available
window.showSection = showSection;
window.togglePlan = togglePlan;
window.exportLayouts = exportLayouts;
window.exportSources = exportSources;
window.toggleDropdown = toggleDropdown;
window.handleCategoryClick = handleCategoryClick;
window.toggleMobileCategory = toggleMobileCategory;
