// Revenue store - localStorage-backed demo state for /revenue.
// Seed is loaded once from data/revenue-seed.json; subsequent reads come from
// localStorage. All mutations dispatch a 'revenue:changed' event so the UI
// can re-render without manual wiring.

// Bumped to v2 when the seed schema changed from per-officer week-2 data to
// the Sorting xlsx Week-26 snapshot. Stale v1 entries are ignored automatically.
const STORAGE_KEY = 'bda.revenue.v2';
const SEED_URL = 'data/revenue-seed.json';

const revenueStore = (function () {
    let state = null;
    let seedSnapshot = null;

    function emit() {
        document.dispatchEvent(new CustomEvent('revenue:changed', { detail: { state } }));
    }

    function persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (err) {
            console.warn('revenue-store: localStorage write failed', err);
        }
    }

    async function init() {
        const seedRes = await fetch(SEED_URL);
        seedSnapshot = await seedRes.json();
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                state = JSON.parse(stored);
                // Ensure new fields seeded after a schema change still appear
                state.zones = state.zones || seedSnapshot.zones;
            } catch (err) {
                console.warn('revenue-store: stored state corrupted, reseeding', err);
                state = structuredClone(seedSnapshot);
                persist();
            }
        } else {
            state = structuredClone(seedSnapshot);
            persist();
        }
        // Demo session state (not persisted to localStorage by design)
        state.currentOfficerId = state.currentOfficerId || null;
        if (typeof state.offTrackThreshold !== 'number') state.offTrackThreshold = 75;
        emit();
        return state;
    }

    function getState() { return state; }

    function setOffTrackThreshold(pct) {
        const n = Number(pct);
        if (!Number.isFinite(n)) return;
        state.offTrackThreshold = Math.max(0, Math.min(200, n));
        persist();
        emit();
    }

    function setWeeklyTarget(officerId, weekIdx, value) {
        const plan = state.actionPlan.find(ap => ap.officerId === officerId);
        if (!plan || !plan.weeks[weekIdx]) return;
        const n = value === '' || value === null ? null : Number(value);
        plan.weeks[weekIdx].target = Number.isFinite(n) ? n : null;
        persist();
        emit();
    }

    function expectedCumulative(officerId, asOf) {
        const plan = state.actionPlan.find(ap => ap.officerId === officerId);
        if (!plan) return 0;
        const cutoff = asOf instanceof Date ? asOf : new Date(asOf);
        let total = 0;
        for (const w of plan.weeks) {
            const ref = w.to || w.from;
            if (!ref) continue;
            const wkEnd = new Date(ref);
            if (wkEnd <= cutoff) total += Number(w.target) || 0;
            else break;
        }
        return total;
    }

    function getOffTrackInfo(officer, asOf) {
        // Prefer the Sorting-xlsx-supplied cumulative target (populated for every
        // Week-26 roster entry). Fall back to action-plan walk for any officer
        // missing it.
        let expected = Number(officer.cumulative?.target);
        if (!Number.isFinite(expected) || expected <= 0) {
            const today = asOf || new Date();
            expected = expectedCumulative(officer.id, today);
        }
        const achieved = officer.cumulative.financial || 0;
        const pct = expected > 0 ? (achieved / expected) * 100 : null;
        const threshold = state.offTrackThreshold ?? 75;
        const isOff = pct != null && pct < threshold;
        return { expected, achieved, pct, threshold, isOff };
    }

    function setCurrentOfficer(officerId) {
        state.currentOfficerId = officerId || null;
        persist();
        emit();
    }

    function reset() {
        state = structuredClone(seedSnapshot);
        state.currentOfficerId = null;
        persist();
        emit();
    }

    function addCdParcel(parcel) {
        const id = `cd-demo-${Date.now()}`;
        const enriched = {
            id,
            ...parcel,
            createdAt: new Date().toISOString(),
            source: 'demo-entry'
        };
        state.cdParcels.unshift(enriched);
        persist();
        emit();
        return enriched;
    }

    function recordWeeklyProgress(officerId, financialCr) {
        const officer = state.officers.find(o => o.id === officerId);
        if (!officer) return;
        const cur = officer.cumulative.financial || 0;
        const newFinancial = cur + Number(financialCr || 0);
        officer.week.financial = Number(financialCr || 0);
        officer.cumulative.financial = newFinancial;
        if (officer.totalTargetCr) {
            officer.totalPct = Number(((newFinancial / officer.totalTargetCr) * 100).toFixed(2));
            officer.cumulative.pct = officer.totalPct;
        }
        if (officer.week.target) {
            officer.week.pct = Number(((Number(financialCr || 0) / officer.week.target) * 100).toFixed(2));
        }
        persist();
        emit();
    }

    // Derived KPIs (computed on read so edits always propagate)
    function kpis(filterFn) {
        const officers = filterFn ? state.officers.filter(filterFn) : state.officers;
        const totalTarget = officers.reduce((a, o) => a + (o.totalTargetCr || 0), 0);
        const totalAchieved = officers.reduce((a, o) => a + (o.cumulative.financial || 0), 0);
        const pct = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;
        const parcels = filterFn
            ? state.cdParcels.filter(p => officers.some(o => o.zone === p.zone))
            : state.cdParcels;
        return {
            totalTargetCr: totalTarget,
            achievedCr: totalAchieved,
            pct,
            cdCount: parcels.length,
            activeOfficers: officers.length
        };
    }

    return {
        init, getState, setCurrentOfficer, reset,
        addCdParcel, recordWeeklyProgress, kpis,
        setOffTrackThreshold, setWeeklyTarget,
        expectedCumulative, getOffTrackInfo,
        STORAGE_KEY
    };
})();

window.revenueStore = revenueStore;
