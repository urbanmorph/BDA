#!/usr/bin/env node
// One-shot seed builder for the /revenue demo.
// Reads supporting-documents/revenue/{Revenue generation FY 26-27.xlsx, BDA_Judistriction Map.kmz}
// Emits public/data/revenue-seed.json and public/data/bda-jurisdiction.geojson.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';
import XLSX from 'xlsx';
import { DOMParser } from '@xmldom/xmldom';
import { kml as kmlToGeoJSON } from '@tmcw/togeojson';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '..');
const SRC_XLSX = resolve(REPO, 'supporting-documents/revenue/Revenue generation FY 26-27.xlsx');
const SRC_SORTING = resolve(REPO, 'supporting-documents/revenue/Sorting 26th week.xlsx');
const SRC_KMZ = resolve(REPO, 'supporting-documents/revenue/BDA_Judistriction Map.kmz');
const OUT_DIR = resolve(REPO, 'public/data');
const OUT_JSON = resolve(OUT_DIR, 'revenue-seed.json');
const OUT_GEOJSON = resolve(OUT_DIR, 'bda-jurisdiction.geojson');

const ZONES = ['East', 'West', 'North', 'South', 'Central', 'Housing'];

// Week 26 snapshot metadata — from the docx charts (21-Dec to 27-Dec 2025).
const SNAPSHOT = {
    fiscalYear: 'FY 2025–26',
    weekNumber: 26,
    weekRange: '21-Dec to 27-Dec 2025',
    weekEnd: '2025-12-27',
    source: 'Sorting 26th week.xlsx + Revenue generation FY 26-27.xlsx'
};

const PROGRESS_SHEET = { East: 'East progress', West: 'West progress', North: 'North progress', South: 'South progress', Housing: 'Housing' };
const ACTION_SHEET   = { East: 'East Action plan', West: 'West Action Plan', North: 'North Action Plan', South: 'South Action Plan', Housing: 'Housing Action Plan' };
const CD_SHEET       = { East: 'EAST CDs', West: 'WEST CDs', North: 'NORTH CDs', South: 'SOUTH CDs' };

function normaliseName(raw) {
  if (!raw || typeof raw !== 'string') return '';
  // Aggressive: strip honorifics, lowercase, drop all non-alphanumeric.
  // Source data has inconsistent spacing/punctuation ("Nandini G S" vs "Nandini GS",
  // "Raghavendra.S.L" vs "Raghavendra"), so collapse to letters+digits only.
  return raw
    .replace(/\bSmt\.?\b|\bSri\.?\b|\bSmt\/Sri\b|\bShri\.?\b/gi, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function officerId(zone, name) {
  const slug = normaliseName(name).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${zone.toLowerCase()}-${slug}`;
}

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseDateDDMMYY(s) {
  if (!s) return null;
  const m = String(s).match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const yyyy = y.length === 2 ? (Number(y) + 2000) : Number(y);
  return `${yyyy}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function readSheetRows(wb, name) {
  const s = wb.Sheets[name];
  if (!s) return [];
  return XLSX.utils.sheet_to_json(s, { header: 1, raw: true, defval: null });
}

// --- Sorting 26th week xlsx (primary officer roster) ------------------------
// Single-sheet flat ranking. Columns:
// Position | Zone | Name | Designation | Total Fixed target | Cumulative Target |
// Cumulative Achived in Cr | Cumulative % | TOTAL % OF TARGET
function parseSortingSheet(rows) {
    const officers = [];
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !r[1] || !r[2]) continue;
        const zoneRaw = String(r[1]).trim();
        const name = String(r[2]).trim();
        if (zoneRaw.length < 2 || name.length < 2) continue;
        const zone = zoneRaw.charAt(0).toUpperCase() + zoneRaw.slice(1).toLowerCase();
        officers.push({
            id: officerId(zone, name),
            position: num(r[0]),
            name,
            designation: r[3] ? String(r[3]).trim() : '',
            zone,
            totalTargetCr: num(r[4]),
            week: { target: null, financial: null, pct: null },
            cumulative: {
                target: num(r[5]),
                financial: num(r[6]),
                pct: num(r[7])
            },
            totalPct: num(r[8])
        });
    }
    return officers;
}

// --- Progress sheets (legacy — kept as fallback only) ------------------------
// Layout: row 0 title; row 1 main header; row 2 sub-header (TARGET/FIN/% × 2);
// data from row 3. Housing has an extra "Details" column shifting indices by 1.
function parseProgressSheet(rows, zone) {
  const offset = zone === 'Housing' ? 1 : 0;
  const C = {
    sl: 0,
    name: 1 + offset,
    desg: 2 + offset,
    totalTarget: 3 + offset,
    wkTarget: 4 + offset,
    wkFinancial: 5 + offset,
    wkPct: 6 + offset,
    cumTarget: 7 + offset,
    cumFinancial: 8 + offset,
    cumPct: 9 + offset,
    totalPct: 10 + offset
  };
  const officers = [];
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const name = r[C.name];
    if (!name || typeof name !== 'string' || name.trim().length < 2) continue;
    officers.push({
      id: officerId(zone, name),
      slNo: num(r[C.sl]),
      name: name.trim(),
      designation: (r[C.desg] || '').toString().trim(),
      zone,
      totalTargetCr: num(r[C.totalTarget]),
      week: {
        target: num(r[C.wkTarget]),
        financial: num(r[C.wkFinancial]),
        pct: num(r[C.wkPct])
      },
      cumulative: {
        target: num(r[C.cumTarget]),
        financial: num(r[C.cumFinancial]),
        pct: num(r[C.cumPct])
      },
      totalPct: num(r[C.totalPct])
    });
  }
  return officers;
}

// --- Action plan sheets ------------------------------------------------------
// Row 0 title; row 1 header (Sl No / Name / Desg / Total Target / WEEK …);
// row 2 "Week 1..N"; row 3 from-date dd.mm.yy; row 4 to-date dd.mm.yy.
// Officer rows start at row 5. Weekly targets occupy cols 4..end.
function parseActionPlanSheet(rows, zone) {
  if (rows.length < 6) return { weeks: [], officers: [] };
  const weekLabels = rows[2] || [];
  const fromDates  = rows[3] || [];
  const toDates    = rows[4] || [];
  const weeks = [];
  for (let c = 4; c < weekLabels.length; c++) {
    const label = weekLabels[c];
    if (!label) continue;
    weeks.push({
      week: typeof label === 'string' ? label : `Week ${c - 3}`,
      from: parseDateDDMMYY(fromDates[c]),
      to: parseDateDDMMYY(toDates[c])
    });
  }
  const officers = [];
  for (let i = 5; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const name = r[1];
    if (!name || typeof name !== 'string' || name.trim().length < 2) continue;
    const weekly = [];
    for (let c = 4; c < 4 + weeks.length; c++) {
      weekly.push(num(r[c]));
    }
    officers.push({
      id: officerId(zone, name),
      name: name.trim(),
      designation: (r[2] || '').toString().trim(),
      zone,
      totalTarget: num(r[3]),
      weekly
    });
  }
  return { weeks, officers };
}

// --- CD sheets ---------------------------------------------------------------
// Row 0 title; row 1 header; row 2+ data. Columns:
// SL No | AE name | Designation | Date of Submission | Layout | Block | Village | Sy.No. | Site No. |
// E-W (Feet) | N-S (Feet) | Total Area (SQ mtr) | Rate per SQ Mtr (min) | Rate per SQ Mtr (guidance) |
// Total Amount | Remarks
function parseCdSheet(rows, zone) {
  const parcels = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const aeName = r[1];
    const layout = r[4];
    // Treat as a parcel only if it has at least a name OR layout
    if ((!aeName || String(aeName).trim().length < 2) && (!layout || String(layout).trim().length < 2)) continue;
    parcels.push({
      id: `cd-${zone.toLowerCase()}-${num(r[0]) || i}`,
      zone,
      aeName: aeName ? String(aeName).trim() : null,
      designation: r[2] ? String(r[2]).trim() : null,
      dateSubmitted: parseDateDDMMYY(r[3]),
      layout: layout ? String(layout).trim() : null,
      block: r[5] ? String(r[5]).trim() : null,
      village: r[6] ? String(r[6]).trim() : null,
      surveyNo: r[7] ? String(r[7]).trim() : null,
      siteNo: r[8] ? String(r[8]).trim() : null,
      ewFeet: num(r[9]),
      nsFeet: num(r[10]),
      areaSqm: num(r[11]),
      ratePerSqmMin: num(r[12]),
      ratePerSqmGuidance: num(r[13]),
      totalAmount: num(r[14]),
      remarks: r[15] ? String(r[15]).trim() : null
    });
  }
  return parcels;
}

// --- KMZ → GeoJSON -----------------------------------------------------------
function parseKmzDescription(desc) {
  if (!desc) return {};
  // togeojson returns either a string or { '@type': 'html', value: '...' }.
  const text = typeof desc === 'string' ? desc : (desc.value || '');
  const out = {};
  const re = /<B>([^<]+)<\/B>\s*=\s*([^<]*)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out[m[1].trim()] = m[2].trim();
  }
  return out;
}

function extractKml(kmzPath) {
  const zip = new AdmZip(kmzPath);
  const entry = zip.getEntries().find(e => /\.kml$/i.test(e.entryName));
  if (!entry) throw new Error('No .kml inside the KMZ');
  return entry.getData().toString('utf-8');
}

function buildJurisdictionGeoJSON(kmzPath, officerNameIndex) {
  const kmlText = extractKml(kmzPath);
  const dom = new DOMParser().parseFromString(kmlText, 'text/xml');
  const gj = kmlToGeoJSON(dom);
  let matched = 0;
  const unmatched = [];
  for (const f of gj.features) {
    const props = f.properties || {};
    const meta = parseKmzDescription(props.description);
    const aeName = meta['AE Name'] || meta['AE name'] || null;
    const aeeName = meta['AEE name'] || meta['AEE Name'] || null;
    const aeCode = meta['AE'] || null;
    const aeeCode = meta['AEE'] || null;
    const idx = aeName ? officerNameIndex[normaliseName(aeName)] : null;
    if (idx) matched++;
    else if (aeName) unmatched.push(aeName);
    f.properties = {
      name: props.name || null,
      aeName, aeeName, aeCode, aeeCode,
      officerId: idx || null,
      officerZone: idx ? idx.split('-')[0] : null
    };
    // Drop heavy point geometry siblings if multi-geometry: keep first polygon
    if (f.geometry && f.geometry.type === 'GeometryCollection') {
      const poly = f.geometry.geometries.find(g => g.type === 'Polygon' || g.type === 'MultiPolygon');
      if (poly) f.geometry = poly;
    }
  }
  return { gj, matched, unmatched };
}

// --- Main --------------------------------------------------------------------
function main() {
  console.log('Reading', SRC_SORTING);
  const sortingWb = XLSX.readFile(SRC_SORTING);
  const sortingRows = readSheetRows(sortingWb, sortingWb.SheetNames[0]);
  const officers = parseSortingSheet(sortingRows);
  console.log(`  Found ${officers.length} officers in Sorting xlsx`);

  // Build lookup index (zone-scoped names sometimes collide across zones).
  const officerNameIndex = {};      // normalised-name -> first matching id (for KMZ join)
  const officerByZoneName = {};     // `${zoneLc}|${nname}` -> id (for action-plan join)
  for (const o of officers) {
    const k = normaliseName(o.name);
    if (!officerNameIndex[k]) officerNameIndex[k] = o.id;
    officerByZoneName[`${o.zone.toLowerCase()}|${k}`] = o.id;
  }

  // Action plan (forward FY plan) — from the original xlsx.
  console.log('Reading', SRC_XLSX);
  const planWb = XLSX.readFile(SRC_XLSX);
  const actionPlan = [];
  let actionPlanMatched = 0, actionPlanUnmatched = 0;
  for (const zone of ZONES) {
    const sheet = ACTION_SHEET[zone];
    if (!sheet) continue;
    const rows = readSheetRows(planWb, sheet);
    const { weeks, officers: planOfficers } = parseActionPlanSheet(rows, zone);
    for (const ap of planOfficers) {
      // Try same-zone match first, then any-zone match, else drop (no orphan officer rows)
      const nname = normaliseName(ap.name);
      const matchedId = officerByZoneName[`${zone.toLowerCase()}|${nname}`] || officerNameIndex[nname];
      if (!matchedId) { actionPlanUnmatched++; continue; }
      actionPlanMatched++;
      actionPlan.push({
        officerId: matchedId,
        zone,
        weeks: weeks.map((w, i) => ({ week: w.week, from: w.from, to: w.to, target: ap.weekly[i] ?? null }))
      });
    }
  }
  console.log(`  Action plan: ${actionPlanMatched} matched, ${actionPlanUnmatched} dropped (no roster match)`);

  // CD parcels (the original xlsx CDs sheets are empty templates today — keep parser wired)
  const cdParcels = [];
  for (const zone of Object.keys(CD_SHEET)) {
    const rows = readSheetRows(planWb, CD_SHEET[zone]);
    cdParcels.push(...parseCdSheet(rows, zone));
  }

  // Sort officers by zone then position for stability
  officers.sort((a, b) =>
    a.zone.localeCompare(b.zone) || (a.position ?? 999) - (b.position ?? 999)
  );

  const seed = {
    generatedAt: new Date().toISOString(),
    snapshot: SNAPSHOT,
    zones: ZONES,
    sourceFile: SNAPSHOT.source,
    officers,
    actionPlan,
    cdParcels
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(seed, null, 2));
  console.log(`Wrote ${OUT_JSON}  (${officers.length} officers, ${actionPlan.length} action plans, ${cdParcels.length} CD parcels)`);

  // KMZ → GeoJSON
  console.log('Reading', SRC_KMZ);
  const { gj, matched, unmatched } = buildJurisdictionGeoJSON(SRC_KMZ, officerNameIndex);
  writeFileSync(OUT_GEOJSON, JSON.stringify(gj));
  console.log(`Wrote ${OUT_GEOJSON}  (${gj.features.length} polygons, ${matched} matched to officers)`);
  if (unmatched.length) {
    console.log(`Unmatched AE names from KMZ (${unmatched.length}):`);
    for (const n of unmatched) console.log('  -', n);
  }
}

main();
