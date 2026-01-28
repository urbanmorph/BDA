# BDA Dashboard - Quick Start Guide

## 🚀 Getting Started (2 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

This will:
- Start Vite dev server at http://localhost:3000
- Auto-open your browser
- Enable hot module reload (changes appear instantly)

### 3. View the Dashboard

The dashboard should open automatically. If not, navigate to:
```
http://localhost:3000
```

## 📱 Navigation

The dashboard has 5 main sections:

1. **Overview** - Key metrics and summary statistics
2. **Master Plan** - RMP 2015 vs 2031 spatial planning
3. **Layouts** - All 1,017 approved layouts with search/filter
4. **Demographics** - Population trends and projections
5. **Environment** - Water bodies, eco-zones, heritage sites

## 🎨 What You'll See

### Overview Page
- 4 key metric cards
- Layout approvals by decade (bar chart)
- Use type distribution (pie chart)
- Population growth trend (line chart)

### Master Plan Page
- Interactive map of Bengaluru
- Plan version toggle (2015 vs 2031)
- Land use breakdown

### Layouts Page
- Searchable table of all approved layouts
- Filters: Taluk, Use Type, Year
- 1,017 layouts from 1972-2025

### Demographics Page
- Population statistics
- Migration patterns
- Age distribution

### Environment Page
- 87 Lakes, 4 Rivers, 1 Reservoir
- Bannerghatta ESZ
- Heritage gardens (Lalbagh, Cubbon Park)

## 🔧 Build for Production

```bash
# Create optimized production build
npm run build

# Preview production build
npm run preview
```

## 🌐 Deploy to Vercel

### Option 1: Vercel Dashboard (Recommended)
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import repository
4. Click Deploy (Vercel auto-detects Vite)

### Option 2: Vercel CLI
```bash
npx vercel
```

## 📂 Project Structure

```
BDA/
├── public/                 # Source files
│   ├── index.html         # Main page
│   ├── js/
│   │   └── app.js         # All functionality
│   └── data/              # JSON data files
│       ├── layouts-sample.json
│       ├── master-plan.json
│       ├── demographics.json
│       └── environment.json
├── dist/                  # Production build (auto-generated)
├── package.json
└── vite.config.js
```

## 🎯 Current Features

✅ Responsive minimalist design (Tailwind CSS)
✅ Interactive charts (Chart.js)
✅ Interactive map (Leaflet.js)
✅ Search and filter layouts
✅ Multiple data sections
✅ Fast dev server (Vite)
✅ Production-ready build
✅ Vercel deployment config

## 📊 Data Files

All data is in JSON format in `public/data/`:

- **layouts-sample.json** - Sample of 9 layouts (from 1,017 total)
- **master-plan.json** - Land use and planning districts
- **demographics.json** - Population data 1971-2031
- **environment.json** - Water bodies, eco-zones, heritage sites

## 🔄 Next Steps

### To Add More Layouts
1. Extract more data from PDF
2. Add to `public/data/layouts-sample.json`
3. Page will auto-update

### To Add New Section
1. Add section HTML in `index.html`
2. Add navigation button
3. Add JavaScript functionality in `app.js`

### To Customize Styling
1. Use Tailwind utility classes
2. Modify colors: Replace `gray-900` with your color
3. Update spacing: Use Tailwind spacing classes (`p-4`, `m-6`, etc.)

## 💡 Tips

- **Dev server** updates instantly when you save files
- **Console** shows any JavaScript errors (F12 → Console)
- **Tailwind cheatsheet**: https://nerdcave.com/tailwind-cheat-sheet
- **Leaflet docs**: https://leafletjs.com/reference.html
- **Chart.js docs**: https://www.chartjs.org/docs/latest/

## ❓ Troubleshooting

### Port already in use?
Change port in `vite.config.js`:
```javascript
server: { port: 3001 }
```

### Charts not showing?
Check browser console for errors. Ensure Chart.js CDN loaded.

### Map not showing?
Verify Leaflet CSS and JS loaded correctly.

## 📖 Documentation

- [DEVELOPMENT.md](DEVELOPMENT.md) - Detailed development guide
- [DASHBOARD_PLAN.md](DASHBOARD_PLAN.md) - Complete dashboard specification
- [DATASOURCES.md](supporting-documents/DATASOURCES.md) - All data sources

## 🎉 You're Ready!

Run `npm run dev` and start exploring the dashboard!
