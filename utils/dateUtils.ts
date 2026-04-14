/**
 * Fast-path utility to parse known date strings directly to an integer (YYYYMMDD)
 * for high-performance primitive comparisons without allocating Date objects.
 */
export const parseDateToInt = (dateString: string | undefined | null): number | null => {
    if (!dateString) return null;

    // Fast paths using charCodeAt to avoid regex or string split allocations
    const len = dateString.length;
    if (len >= 10) {
        // Fast path for YYYY-MM-DD
        if (dateString.charCodeAt(4) === 45 && dateString.charCodeAt(7) === 45) { // '-' is 45
            const y = parseInt(dateString.substring(0, 4), 10);
            const m = parseInt(dateString.substring(5, 7), 10);
            const d = parseInt(dateString.substring(8, 10), 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                return y * 10000 + m * 100 + d;
            }
        }

        // Fast path for DD/MM/YYYY
        if (dateString.charCodeAt(2) === 47 && dateString.charCodeAt(5) === 47) { // '/' is 47
            const d = parseInt(dateString.substring(0, 2), 10);
            const m = parseInt(dateString.substring(3, 5), 10);
            const y = parseInt(dateString.substring(6, 10), 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                return y * 10000 + m * 100 + d;
            }
        }

        // Fast path for DD-MM-YYYY
        if (dateString.charCodeAt(2) === 45 && dateString.charCodeAt(5) === 45) { // '-' is 45
            const d = parseInt(dateString.substring(0, 2), 10);
            const m = parseInt(dateString.substring(3, 5), 10);
            const y = parseInt(dateString.substring(6, 10), 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                return y * 10000 + m * 100 + d;
            }
        }
    }

    // Fallback to safe parsing for unpadded dates (e.g. D/M/YYYY or DD/M/YYYY)
    // We can reuse parseDateSafe logic which already handles this robustly
    const safeDate = parseDateSafe(dateString);
    if (safeDate) {
        return safeDate.getFullYear() * 10000 + (safeDate.getMonth() + 1) * 100 + safeDate.getDate();
    }

    return null;
};

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
