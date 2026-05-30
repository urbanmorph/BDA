// Revenue store - live read from the FY 2026-27 Google Sheet.
// No localStorage, no editing - the Sheet is the source of truth and the
// dashboard mirrors it. Officers continue entering data in the Sheet exactly
// as the PDF describes (ZC handles internal AE/AEE/EE summations).
//
// sessionStorage caches the last successful fetch for ~60s so quick reloads
// or tab switches don't re-pull all 14 tabs.

const SHEET_ID = '1aSn1A6bODbKqZDt9KNSqLJHxYSPAKFE9fvnchHrDtFE';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
const CACHE_KEY = 'bda.revenue.cache.v1';
const CACHE_TTL_MS = 60_000;

const TABS = {
    progress: {
        East:    { gid: 0,          hasDetailsCol: false },
        West:    { gid: 4176553,    hasDetailsCol: false },
        North:   { gid: 1786074610, hasDetailsCol: false },
        South:   { gid: 1268093497, hasDetailsCol: false },
        Housing: { gid: 1877107890, hasDetailsCol: true  }
    },
    actionPlan: {
        East:    { gid: 489392613  },
        West:    { gid: 188026353  },
        North:   { gid: 1979592390 },
        South:   { gid: 947747770  },
        Housing: { gid: 1193032096 }
    },
    cdParcels: {
        East:  { gid: 1432275589 },
        West:  { gid: 1768304056 },
        North: { gid: 533003225  },
        South: { gid: 493807507  }
        // Housing: no CDs tab (consistent with the original xlsx)
    }
};

const ZONES = ['East', 'West', 'North', 'South', 'Housing'];

const revenueStore = (function () {
    let state = null;
    let lastError = null;

    function emit() {
        document.dispatchEvent(new CustomEvent('revenue:changed', { detail: { state, error: lastError } }));
    }

    function getState() { return state; }
    function getLastError() { return lastError; }

    function normaliseName(s) {
        return String(s || '')
            .replace(/^(smt\.?|sri\.?|sri\/smt\.?|mr\.?|mrs\.?|ms\.?|dr\.?)\s+/i, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
    }

    function makeOfficerId(zone, name) {
        return `${zone.toLowerCase()}-${normaliseName(name)}`;
    }

    // Minimal CSV parser sufficient for Google Sheets export. Handles quoted
    // cells, embedded newlines, and "" escapes.
    function parseCsv(text) {
        const rows = [];
        let row = [], cell = '', inQuotes = false, i = 0;
        while (i < text.length) {
            const c = text[i];
            if (inQuotes) {
                if (c === '"' && text[i + 1] === '"') { cell += '"'; i += 2; continue; }
                if (c === '"') { inQuotes = false; i++; continue; }
                cell += c; i++; continue;
            }
            if (c === '"') { inQuotes = true; i++; continue; }
            if (c === ',') { row.push(cell); cell = ''; i++; continue; }
            if (c === '\r') { i++; continue; }
            if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; continue; }
            cell += c; i++;
        }
        if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
        return rows;
    }

    function toNumber(s) {
        if (s == null || s === '') return null;
        const cleaned = String(s).replace(/[,₹\s]/g, '');
        if (cleaned === '' || cleaned === '-') return null;
        const n = Number(cleaned);
        return Number.isFinite(n) ? n : null;
    }

    function parseProgressSheet(zone, csv, hasDetailsCol) {
        const rows = parseCsv(csv);
        const offset = hasDetailsCol ? 1 : 0;

        // Row 1 contains the week descriptor ("TARGET ACHIEVED IN WEEK 3nd (17-05-2026 TO 23-05-2026)").
        const headerRow = rows[1] || [];
        const headerJoin = headerRow.join(' ');
        const rangeMatch = headerJoin.match(/WEEK\s*\d+\s*\w*\s*\(([^)]+)\)/i);
        const weekRange = rangeMatch ? rangeMatch[1].trim() : null;
        const weekNumMatch = headerJoin.match(/WEEK\s*(\d+)/i);
        const weekNumber = weekNumMatch ? Number(weekNumMatch[1]) : null;

        const officers = [];
        for (let r = 3; r < rows.length; r++) {
            const row = rows[r];
            const name = (row[1 + offset] || '').trim();
            if (!name) continue;
            const totalTargetCr = toNumber(row[3 + offset]);
            officers.push({
                id: makeOfficerId(zone, name),
                name,
                designation: (row[2 + offset] || '').trim(),
                zone,
                totalTargetCr,
                week: {
                    target: toNumber(row[4 + offset]),
                    financial: toNumber(row[5 + offset]),
                    pct: toNumber(row[6 + offset])
                },
                cumulative: {
                    target: toNumber(row[7 + offset]),
                    financial: toNumber(row[8 + offset]),
                    pct: toNumber(row[9 + offset])
                },
                totalPct: toNumber(row[10 + offset])
            });
        }
        return { officers, weekRange, weekNumber };
    }

    function parseActionPlan(zone, csv) {
        const rows = parseCsv(csv);
        // Row 0 = title
        // Row 1 = ["Sl No","Name","Desg","Total Target","Weekly Targets",...]
        // Row 2 = week labels ("Week 1" ... "Week 39")
        // Row 3 = from-dates
        // Row 4 = to-dates
        // Row 5+ = officer rows
        const weekLabels = (rows[2] || []).slice(4);
        const fromDates  = (rows[3] || []).slice(4);
        const toDates    = (rows[4] || []).slice(4);
        const plans = [];
        for (let r = 5; r < rows.length; r++) {
            const row = rows[r];
            const name = (row[1] || '').trim();
            if (!name) continue;
            const weeks = [];
            for (let w = 0; w < weekLabels.length && w < 39; w++) {
                const label = (weekLabels[w] || '').trim();
                if (!label && !fromDates[w]) break;
                weeks.push({
                    week: label || `Week ${w + 1}`,
                    from: (fromDates[w] || '').trim(),
                    to:   (toDates[w]   || '').trim(),
                    target: toNumber(row[4 + w])
                });
            }
            plans.push({
                officerId: makeOfficerId(zone, name),
                name,
                designation: (row[2] || '').trim(),
                zone,
                totalTarget: toNumber(row[3]),
                weeks
            });
        }
        return plans;
    }

    function parseCdSheet(zone, csv) {
        const rows = parseCsv(csv);
        const parcels = [];
        for (let r = 2; r < rows.length; r++) {
            const row = rows[r];
            const aeName = (row[1] || '').trim();
            const layout = (row[4] || '').trim();
            const dateSubmitted = (row[3] || '').trim();
            if (!aeName && !layout && !dateSubmitted) continue;
            const ewFeet = toNumber(row[9]);
            const nsFeet = toNumber(row[10]);
            let areaSqm = toNumber(row[11]);
            if (areaSqm == null && ewFeet != null && nsFeet != null) {
                areaSqm = Number((ewFeet * nsFeet * 0.092903).toFixed(2));
            }
            const ratePerSqmGuidance = toNumber(row[13]);
            let totalAmount = toNumber(row[14]);
            if (totalAmount == null && areaSqm != null && ratePerSqmGuidance != null) {
                totalAmount = Number((areaSqm * ratePerSqmGuidance).toFixed(2));
            }
            parcels.push({
                id: `cd-${zone.toLowerCase()}-${r}`,
                zone,
                aeName,
                designation: (row[2] || '').trim(),
                dateSubmitted,
                layout,
                block:    (row[5] || '').trim(),
                village:  (row[6] || '').trim(),
                surveyNo: (row[7] || '').trim(),
                siteNo:   (row[8] || '').trim(),
                ewFeet, nsFeet, areaSqm,
                ratePerSqmMin: toNumber(row[12]),
                ratePerSqmGuidance,
                totalAmount,
                remarks: (row[15] || '').trim()
            });
        }
        return parcels;
    }

    async function fetchCsv(gid) {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Sheet tab ${gid} → HTTP ${res.status}`);
        return res.text();
    }

    async function fetchAll() {
        const tasks = [];
        for (const zone of ZONES) {
            const p  = TABS.progress[zone];
            const ap = TABS.actionPlan[zone];
            const cd = TABS.cdParcels[zone];
            tasks.push(fetchCsv(p.gid).then(csv => ({ kind: 'progress', zone, csv, hasDetailsCol: p.hasDetailsCol })));
            tasks.push(fetchCsv(ap.gid).then(csv => ({ kind: 'actionPlan', zone, csv })));
            if (cd) tasks.push(fetchCsv(cd.gid).then(csv => ({ kind: 'cdParcels', zone, csv })));
        }
        const results = await Promise.all(tasks);
        const officers = [];
        const actionPlan = [];
        const cdParcels = [];
        let weekRange = null, weekNumber = null;
        for (const r of results) {
            if (r.kind === 'progress') {
                const parsed = parseProgressSheet(r.zone, r.csv, r.hasDetailsCol);
                officers.push(...parsed.officers);
                if (parsed.weekRange && !weekRange) weekRange = parsed.weekRange;
                if (parsed.weekNumber && !weekNumber) weekNumber = parsed.weekNumber;
            } else if (r.kind === 'actionPlan') {
                actionPlan.push(...parseActionPlan(r.zone, r.csv));
            } else if (r.kind === 'cdParcels') {
                cdParcels.push(...parseCdSheet(r.zone, r.csv));
            }
        }
        return {
            zones: ZONES,
            officers,
            actionPlan,
            cdParcels,
            source: {
                sheetId: SHEET_ID,
                sheetUrl: SHEET_URL,
                fiscalYear: 'FY 2026–27',
                fetchedAt: new Date().toISOString(),
                weekRange,
                weekNumber
            }
        };
    }

    function loadCache() {
        try {
            const raw = sessionStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const obj = JSON.parse(raw);
            if (!obj || !obj.state || !obj.cachedAt) return null;
            if (Date.now() - obj.cachedAt > CACHE_TTL_MS) return null;
            return obj.state;
        } catch (_) { return null; }
    }

    function saveCache(s) {
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ state: s, cachedAt: Date.now() })); }
        catch (_) { /* quota or disabled — ignore */ }
    }

    async function init() {
        const cached = loadCache();
        if (cached) {
            state = cached;
            lastError = null;
            emit();
            // Background refresh; if it fails the user keeps the cached view.
            refresh().catch(err => console.warn('revenue-store: background refresh failed', err));
            return state;
        }
        return refresh();
    }

    async function refresh() {
        try {
            const next = await fetchAll();
            state = next;
            lastError = null;
            saveCache(state);
            emit();
            return state;
        } catch (err) {
            lastError = err;
            console.error('revenue-store: fetch failed', err);
            if (!state) {
                state = {
                    zones: ZONES, officers: [], actionPlan: [], cdParcels: [],
                    source: { sheetId: SHEET_ID, sheetUrl: SHEET_URL, error: String(err.message || err) }
                };
            }
            emit();
            throw err;
        }
    }

    function parseSheetDate(s) {
        const m = String(s || '').match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
        if (!m) return null;
        return new Date(2000 + Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    }

    function expectedCumulative(officerId, asOf) {
        const plan = state?.actionPlan.find(ap => ap.officerId === officerId);
        if (!plan) return 0;
        const cutoff = asOf instanceof Date ? asOf : new Date(asOf);
        let total = 0;
        for (const w of plan.weeks) {
            const wkEnd = parseSheetDate(w.to || w.from);
            if (!wkEnd) continue;
            if (wkEnd <= cutoff) total += Number(w.target) || 0;
            else break;
        }
        return total;
    }

    function kpis(filterFn) {
        const officers = filterFn ? state.officers.filter(filterFn) : state.officers;
        const totalTarget = officers.reduce((a, o) => a + (o.totalTargetCr || 0), 0);
        const achievedCr = officers.reduce((a, o) => a + (o.cumulative.financial || 0), 0);
        const pct = totalTarget > 0 ? (achievedCr / totalTarget) * 100 : 0;
        const parcels = filterFn
            ? state.cdParcels.filter(p => officers.some(o => o.zone === p.zone))
            : state.cdParcels;
        return { totalTargetCr: totalTarget, achievedCr, pct, cdCount: parcels.length, activeOfficers: officers.length };
    }

    return {
        init, refresh, getState, getLastError, kpis, expectedCumulative,
        SHEET_URL, SHEET_ID, CACHE_TTL_MS
    };
})();

window.revenueStore = revenueStore;
