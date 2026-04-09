export const parseDateSafe = (dateString: string | undefined | null): Date | null => {
    if (!dateString) return null;

    // 1. Try generic Date constructor (handles ISO YYYY-MM-DD)
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) return date;

    // 2. Try DD/MM/YYYY format (Common in Brazil CSVs)
    const dmyMatch = String(dateString).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const month = parseInt(dmyMatch[2], 10) - 1; // Month is 0-indexed
        const year = parseInt(dmyMatch[3], 10);
        date = new Date(year, month, day);
        if (!isNaN(date.getTime())) return date;
    }

    // 3. Try DD-MM-YYYY
    const dmyHyphenMatch = String(dateString).match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (dmyHyphenMatch) {
        const day = parseInt(dmyHyphenMatch[1], 10);
        const month = parseInt(dmyHyphenMatch[2], 10) - 1;
        const year = parseInt(dmyHyphenMatch[3], 10);
        date = new Date(year, month, day);
        if (!isNaN(date.getTime())) return date;
    }

    return null;
};

/**
 * High-performance helper to check if a parsed target date falls within pre-parsed boundaries.
 * Useful when iterating over large datasets to avoid parsing start/end dates repeatedly.
 */
export const isDateWithinBounds = (
    tDate: Date,
    parsedStartDate: Date | null,
    parsedEndDate: Date | null
): boolean => {
    if (parsedStartDate && tDate < parsedStartDate) return false;
    if (parsedEndDate && tDate > parsedEndDate) return false;
    return true;
};

export const isDateInRange = (
    targetDate: string | undefined | null,
    startDate: string | undefined | null,
    endDate: string | undefined | null
): boolean => {
    const tDate = parseDateSafe(targetDate);
    if (!tDate) return false;

    // Reset time for consistent comparison
    tDate.setHours(0, 0, 0, 0);

    if (startDate) {
        const sDate = parseDateSafe(startDate);
        if (sDate) {
            sDate.setHours(0, 0, 0, 0);
            if (tDate < sDate) return false;
        }
    }

    if (endDate) {
        const eDate = parseDateSafe(endDate);
        if (eDate) {
            eDate.setHours(23, 59, 59, 999);
            if (tDate > eDate) return false;
        }
    }

    return true;
};

/**
 * High-performance fast path to parse standard date strings into YYYYMMDD integer format.
 * Used in hot-loops to avoid new Date() instantiation overhead and GC pressure.
 */
export const parseDateToInt = (dateString: string | undefined | null): number | null => {
    if (!dateString) return null;

    // Fast path: YYYY-MM-DD (length 10)
    if (dateString.length >= 10 && dateString[4] === '-' && dateString[7] === '-') {
        const y = parseInt(dateString.substring(0, 4), 10);
        const m = parseInt(dateString.substring(5, 7), 10);
        const d = parseInt(dateString.substring(8, 10), 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return y * 10000 + m * 100 + d;
    }

    // Fast path: DD/MM/YYYY
    const slash1 = dateString.indexOf('/');
    if (slash1 !== -1) {
        const slash2 = dateString.indexOf('/', slash1 + 1);
        if (slash2 !== -1) {
            const d = parseInt(dateString.substring(0, slash1), 10);
            const m = parseInt(dateString.substring(slash1 + 1, slash2), 10);
            const y = parseInt(dateString.substring(slash2 + 1, slash2 + 5), 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return y * 10000 + m * 100 + d;
        }
    }

    // Fast path: DD-MM-YYYY
    const dash1 = dateString.indexOf('-');
    if (dash1 !== -1 && dash1 <= 2) {
        const dash2 = dateString.indexOf('-', dash1 + 1);
        if (dash2 !== -1) {
            const d = parseInt(dateString.substring(0, dash1), 10);
            const m = parseInt(dateString.substring(dash1 + 1, dash2), 10);
            const y = parseInt(dateString.substring(dash2 + 1, dash2 + 5), 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return y * 10000 + m * 100 + d;
        }
    }

    // Fallback native parse
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    }

    return null;
};
