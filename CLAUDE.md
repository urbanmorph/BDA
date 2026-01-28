# BDA Dashboard - Development Guide for Claude

## Project Overview

This is a dashboard for Bengaluru Development Authority (BDA) built with vanilla JavaScript, Tailwind CSS, and deployed on Vercel. The project uses JSON files for data storage (prototype phase) before migrating to a backend database.

## Tech Stack

- **Frontend Framework**: Vanilla JavaScript (no framework)
- **CSS Framework**: Tailwind CSS (via CDN)
- **Build Tool**: Vite 5.x
- **Deployment**: Vercel
- **Data Storage**: JSON files (prototype phase)
- **Maps**: Leaflet.js
- **Charts**: Chart.js

## Color Scheme

The dashboard uses an **earthy color palette** with no gradients, following a minimalist modern design:

### Primary Colors
```javascript
earth: {
    50: '#f8f6f3',   // Lightest earth tone
    100: '#e8e3dc',
    200: '#d4c9ba',
    300: '#bfa890',
    400: '#a88967',
    500: '#8b6f47',  // Primary earth brown
    600: '#6d5639',
    700: '#564430',
    800: '#3d2f23',
    900: '#2a1f17',  // Darkest earth tone
}

sage: {
    50: '#f6f7f3',
    100: '#e8ebe3',
    200: '#d1d8c7',
    300: '#b4bfa3',
    400: '#97a67f',
    500: '#7a8c5e',  // Sage green (secondary)
    600: '#5f6e49',
    700: '#4a543a',
    800: '#363d2b',
    900: '#252a1e',
}

terracotta: {
    50: '#fdf5f3',
    100: '#f9e6e0',
    200: '#f3ccc1',
    300: '#e8a692',
    400: '#d97d5e',
    500: '#c85a36',  // Terracotta orange-red (accent)
    600: '#a8442a',
    700: '#853525',
    800: '#622821',
    900: '#451d18',
}
```

### Usage Guidelines
- **earth-**: Primary UI elements (buttons, headers, text)
- **sage-**: Secondary elements, success states, data visualizations
- **terracotta-**: Accents, alerts, important highlights, chart accents
- **NO gradients** - Use solid colors only
- **NO custom CSS** - Use Tailwind utility classes exclusively

### Chart Colors
```javascript
const earthColors = {
    primary: '#8b6f47',      // earth-500
    secondary: '#7a8c5e',    // sage-500
    accent: '#c85a36',       // terracotta-500
    light: '#d4c9ba',        // earth-200
    dark: '#2a1f17'          // earth-900
};
```

## Development Workflow

### 1. Local Development with Vite

**IMPORTANT**: Always run vite dev server for testing before pushing to git.

```bash
# Start Vite dev server (keeps localhost running)
npm run dev

# Vite will start at http://localhost:3000
# Server stays running - DO NOT stop it during development
# Hot Module Replacement (HMR) automatically reloads changes
```

**Development Process:**
1. Start vite: `npm run dev`
2. Make changes to files
3. Test in browser at http://localhost:3000
4. Verify all sections work correctly
5. Get user feedback
6. Iterate until satisfied
7. Only then commit and push to git

### 2. Building for Production

```bash
# Build the project
npm run build

# This creates /dist folder with optimized files
# Vercel will run this command during deployment
```

### 3. Preview Production Build Locally

```bash
# Preview the production build
npm run preview

# Runs at http://localhost:4173
# Use this to test the exact production build
```

### 4. Git Workflow

```bash
# Check status
git status

# Stage changes
git add .

# Commit with detailed message
git commit -m "Description of changes

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to GitHub
git push origin main
```

### 5. Vercel Deployment

```bash
# Deploy to Vercel production
vercel --prod

# The command will:
# - Upload files
# - Run npm install
# - Run npm run build (vite build)
# - Deploy to https://bda-sandy.vercel.app
```

**Automatic Deployment:**
- Vercel automatically deploys on git push to main
- Manual deployment: `vercel --prod`

## Project Structure

```
BDA/
├── public/                 # Vite root directory
│   ├── index.html         # Main HTML file
│   ├── css/               # CSS files (if any)
│   ├── js/
│   │   └── app.js         # Main JavaScript application
│   ├── data/              # JSON data files
│   │   ├── layouts-sample.json
│   │   ├── master-plan.json
│   │   ├── demographics.json
│   │   ├── environment.json
│   │   └── departments.json
│   └── assets/            # Images, icons
├── dist/                  # Build output (gitignored)
├── vite.config.js         # Vite configuration
├── package.json           # NPM dependencies
├── vercel.json            # Vercel deployment config
└── CLAUDE.md              # This file
```

## JSON Data Storage

### Current Approach (Prototype Phase)

All data is stored in JSON files in `public/data/`:

1. **layouts-sample.json** - BDA approved layouts data (9 samples of 1,017 total)
2. **master-plan.json** - Master plan land use data (RMP 2015, RMP 2031)
3. **demographics.json** - Population, migration, age distribution data
4. **environment.json** - Lakes, rivers, eco-sensitive zones
5. **departments.json** - BDA departments, statutory functions, performance

### Loading JSON Data

```javascript
// In app.js
async function loadData() {
    try {
        const response = await fetch('data/filename.json');
        const data = await response.json();
        // Process data
    } catch (error) {
        console.error('Error loading data:', error);
    }
}
```

### Future Migration to Backend

Once prototype is approved, migrate to:
- **Database**: PostgreSQL + PostGIS
- **Backend**: Node.js/Express or Python/FastAPI
- **API**: RESTful API for data access
- Keep same frontend structure

## Vite Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
    root: 'public',              // Serve files from /public
    build: {
        outDir: '../dist',       // Output to /dist
        emptyOutDir: true
    },
    server: {
        port: 3000,              // Dev server port
        open: true               // Auto-open browser
    }
});
```

## Vercel Configuration

```json
// vercel.json
{
    "buildCommand": "npm run build",
    "outputDirectory": "dist",
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## Common Tasks

### Adding a New Section

1. **Create JSON data file** in `public/data/new-section.json`
2. **Add navigation button** in `index.html`:
   ```html
   <button onclick="showSection('new-section')" class="nav-btn px-4 py-2 text-sm font-medium text-earth-700 hover:bg-earth-50 rounded-lg">
       New Section
   </button>
   ```
3. **Add section HTML** in `index.html`:
   ```html
   <section id="new-section-section" class="section-content hidden">
       <!-- Content here -->
   </section>
   ```
4. **Add JavaScript function** to load and populate data in `app.js`
5. **Test in vite** - `npm run dev`
6. **Verify it works** before committing

### Debugging

1. **Console Errors**: Open browser DevTools (F12) → Console tab
2. **Network Errors**: DevTools → Network tab (check if JSON files load)
3. **Vite Errors**: Check terminal where `npm run dev` is running
4. **Build Errors**: Run `npm run build` and check terminal output

### Testing Checklist Before Git Push

- [ ] Vite dev server running (`npm run dev`)
- [ ] All sections load without errors
- [ ] All navigation buttons work
- [ ] Charts render correctly
- [ ] Map displays properly
- [ ] JSON data loads successfully
- [ ] No console errors in browser DevTools
- [ ] Colors follow earthy palette
- [ ] No custom CSS added
- [ ] Mobile responsive (test at different widths)
- [ ] User has reviewed and approved changes

## Important Notes

### DO:
✅ Always run `npm run dev` before making changes
✅ Keep localhost running during development
✅ Test thoroughly before git push
✅ Use Tailwind utility classes only
✅ Follow earthy color palette
✅ Use JSON files for data
✅ Write descriptive commit messages

### DON'T:
❌ Don't push to git without testing in vite first
❌ Don't write custom CSS - use Tailwind only
❌ Don't use gradients
❌ Don't use frameworks (React, Vue, etc.)
❌ Don't commit without user feedback
❌ Don't use gray colors - use earth tones

## Troubleshooting

### Vite not starting
```bash
# Kill any process on port 3000
lsof -ti:3000 | xargs kill -9

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### JSON data not loading
- Check file path: `data/filename.json` (relative to public/)
- Check JSON syntax: Use online JSON validator
- Check browser Network tab for 404 errors
- Verify file exists in `public/data/`

### Vercel deployment fails
- Check build locally: `npm run build`
- Check `vercel.json` configuration
- Check build logs in Vercel dashboard
- Ensure `dist/` folder is created

### Sections not displaying
- Check section ID: `id="section-name-section"`
- Check JavaScript function: `showSection('section-name')`
- Check console for JavaScript errors
- Verify section is not hidden by default

## Live URLs

- **Production**: https://bda-sandy.vercel.app
- **GitHub Repo**: https://github.com/urbanmorph/BDA
- **Vercel Dashboard**: https://vercel.com/sathyas-projects-5dfd8e1a/bda

## Development Principles

1. **Minimalist Design**: Clean, simple, functional
2. **No Custom CSS**: Tailwind utilities only
3. **Earthy Colors**: Natural browns, greens, terracotta
4. **Vanilla JS**: No framework dependencies
5. **JSON Storage**: Simple prototype data structure
6. **Test First**: Always test in vite before git push
7. **User Feedback**: Get approval before deployment
8. **Keep Localhost Running**: For continuous testing

## Quick Reference Commands

```bash
# Development
npm run dev              # Start dev server (KEEP RUNNING)

# Build
npm run build           # Build for production
npm run preview         # Preview production build

# Git
git status              # Check changes
git add .               # Stage all changes
git commit -m "msg"     # Commit
git push origin main    # Push to GitHub

# Vercel
vercel --prod           # Deploy to production
```

---

**Last Updated**: 2026-01-28
**Project Status**: Active Development
**Current Phase**: Prototype with JSON storage
**Next Phase**: Backend migration (PostgreSQL + PostGIS)
