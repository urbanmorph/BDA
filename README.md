# BDA Dashboard Project

## Overview

A comprehensive dashboard to visualize the functions and activities of the Bengaluru Development Authority (BDA) as conferred by the BDA Act 1976 and its amendments.

## Project Status

**Current Phase**: Planning & Design

## Documentation

- **[Dashboard Plan](DASHBOARD_PLAN.md)**: Comprehensive plan with all components, technical implementation, and development phases
- **[Data Sources](supporting-documents/DATASOURCES.md)**: Complete list of data sources, APIs, and references

## Key Features

### 10 Core Dashboard Components

1. **Overview & Key Metrics**: High-level KPIs and trends
2. **Master Plan Visualization**: RMP 2015 & 2031 spatial planning
3. **BDA Layouts & Development Map**: All approved layouts (1972-2025)
4. **Functional Areas**: BDA's statutory functions implementation
5. **Economic Development**: Industrial areas, SEZs, economic indicators
6. **Environmental & Sensitive Areas**: Eco-zones, water bodies, conservation
7. **Demographics & Population**: Historical trends and projections
8. **E-Auction & Land Management**: Current auctions and land inventory
9. **Infrastructure & Transportation**: Roads, metro, connectivity
10. **Administrative Boundaries**: BDA LPA and other planning authorities

## Technology Stack (Proposed)

- **Frontend**: React.js + Leaflet.js/Mapbox + D3.js
- **Backend**: Node.js/Python (FastAPI)
- **Database**: PostgreSQL + PostGIS
- **Data Processing**: Python (Pandas, GeoPandas)

## Data Coverage

- **Approved Layouts**: 1972-2025 (64-page register)
- **Master Plans**: RMP 2015 (in force), RMP 2031 (draft)
- **Planning Area**: BDA LPA covering BBMP and surrounding villages
- **Population**: Historical (1971-2011) + Projections (2031)
- **Environmental**: Eco-sensitive zones, water bodies, drainage systems
- **Economic**: Industrial estates, SEZs, employment data

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start dev server (opens at http://localhost:3000)
npm run dev
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Deploy to Vercel

```bash
# Deploy with Vercel CLI
npx vercel

# Or connect repo to Vercel dashboard for auto-deploy
```

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed development guide.

## Development Phases

- **Phase 1**: Foundation (Weeks 1-2) - Setup & Data Extraction
- **Phase 2**: Core Components (Weeks 3-4) - Basic visualizations
- **Phase 3**: Data Enrichment (Weeks 5-6) - Geocoding & GIS
- **Phase 4**: Advanced Features (Weeks 7-8) - Complete all components
- **Phase 5**: Polish & Deploy (Weeks 9-10) - Testing & Deployment

## Key Challenges

1. **Geocoding**: Converting village/taluk names to coordinates
2. **Data Extraction**: Processing 200+ pages of PDF documents
3. **Historical Data**: Mapping 50+ years of development
4. **Multiple Sources**: Integrating diverse data formats

## Contributing

(To be defined)

## License

(To be defined)

## Contact

(To be defined)

## Acknowledgments

- **BDA**: For public data availability
- **OpenCity**: For hosting RMP 2015 data
- **Karnataka Government**: For legal documents and land records portal

---

## Project Structure

```
BDA/
├── README.md
├── DASHBOARD_PLAN.md
├── supporting-documents/
│   ├── DATASOURCES.md
│   └── (downloaded PDFs and data files)
├── data/
│   ├── raw/              # Raw extracted data
│   ├── processed/        # Cleaned and geocoded data
│   └── geojson/          # Spatial data
├── src/
│   ├── frontend/         # React application
│   ├── backend/          # API server
│   └── data-processing/  # ETL scripts
├── docs/
│   └── api/              # API documentation
└── tests/
```

## Next Steps

1. Extract data from PDF documents
2. Set up database schema
3. Build data processing pipeline
4. Create initial prototype
5. Iterative development of dashboard components

See [DASHBOARD_PLAN.md](DASHBOARD_PLAN.md) for detailed implementation plan.
