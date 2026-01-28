# BDA Dashboard - Development Guide

## Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start dev server (will open at http://localhost:3000)
npm run dev
```

The dev server will:
- Auto-reload on file changes
- Serve from `public/` directory
- Open browser automatically

### Build for Production

```bash
# Build optimized production bundle
npm run build
```

Output will be in `dist/` folder.

### Preview Production Build

```bash
# Preview the production build locally
npm run preview
```

## Project Structure

```
BDA/
├── public/                 # Source files (served by Vite)
│   ├── index.html         # Main HTML file
│   ├── js/
│   │   └── app.js         # Main JavaScript
│   ├── data/
│   │   └── layouts-sample.json  # Sample data
│   └── assets/
├── supporting-documents/   # Documentation and data sources
├── dist/                  # Production build (generated)
├── package.json
├── vite.config.js         # Vite configuration
└── vercel.json           # Vercel deployment config
```

## Technology Stack

- **Vite**: Build tool and dev server
- **Vanilla JavaScript**: No framework dependencies
- **Tailwind CSS**: Utility-first CSS framework (via CDN)
- **Leaflet.js**: Interactive maps
- **Chart.js**: Data visualizations
- **Vercel**: Deployment platform

## Development Workflow

### Adding New Features

1. Create/edit files in `public/` directory
2. Vite will auto-reload changes
3. Test in browser at http://localhost:3000

### Adding New Data

1. Add JSON files to `public/data/`
2. Update `app.js` to load the data
3. Use `fetch()` API to load JSON

### Styling

- Use Tailwind CSS utility classes (loaded via CDN)
- Minimal custom CSS (only for special cases like map height)
- Follow minimalist design principles

## Deployment

### Vercel (Recommended)

1. Connect GitHub repo to Vercel
2. Vercel will auto-detect Vite
3. Deploy with one click

Or use Vercel CLI:

```bash
npx vercel
```

### Manual Deployment

```bash
# Build production files
npm run build

# Deploy dist/ folder to any static host
```

## Data Extraction

To extract more data from PDFs:

1. Use `scripts/extract-layouts-data.js` (to be created)
2. Or manually add to `public/data/` folder

## Environment Variables

Create `.env.local` for local development:

```env
VITE_API_URL=https://api.example.com
```

Access in code:
```javascript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Troubleshooting

### Port Already in Use

Change port in `vite.config.js`:

```javascript
server: {
  port: 3001
}
```

### Map Not Loading

Check browser console for:
- Leaflet CSS loaded correctly
- JavaScript errors
- Network requests

### Charts Not Showing

Verify:
- Chart.js loaded via CDN
- Canvas elements have correct IDs
- Data format is correct

## Performance

### Production Build

Vite automatically:
- Minifies JavaScript
- Optimizes assets
- Creates efficient bundles

### Map Performance

- Use marker clustering for many markers
- Lazy load map tiles
- Limit zoom levels

### Chart Performance

- Limit data points displayed
- Use responsive: false for static charts
- Destroy charts before recreating

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript required
- CSS Grid and Flexbox support needed

## Contributing

1. Create feature branch
2. Make changes
3. Test locally with `npm run dev`
4. Build production with `npm run build`
5. Submit pull request

## Resources

- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Leaflet.js](https://leafletjs.com/)
- [Chart.js](https://www.chartjs.org/)

## License

MIT
