/**
 * Fast-path utility that converts common date strings into YYYYMMDD integers.
 * Ideal for high-throughput filtering loops to avoid `new Date()` allocation overhead.
 * Returns null if the format isn't strictly recognized by the fast path.
 *
 * Supports formats like YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD, etc.
 * Uses `charCodeAt` to check positions.
 */
export const parseDateToInt = (dateString: string | undefined | null): number | null => {
    if (!dateString || typeof dateString !== 'string' || dateString.length < 10) return null;

    // ISO: YYYY-MM-DD or YYYY/MM/DD
    if (
        (dateString.charCodeAt(4) === 45 || dateString.charCodeAt(4) === 47) &&
        (dateString.charCodeAt(7) === 45 || dateString.charCodeAt(7) === 47)
    ) {
        const y = parseInt(dateString.substring(0, 4), 10);
        const m = parseInt(dateString.substring(5, 7), 10);
        const d = parseInt(dateString.substring(8, 10), 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            return y * 10000 + m * 100 + d;
        }
    }

    // Brazilian: DD/MM/YYYY or DD-MM-YYYY
    if (
        (dateString.charCodeAt(2) === 47 || dateString.charCodeAt(2) === 45) &&
        (dateString.charCodeAt(5) === 47 || dateString.charCodeAt(5) === 45)
    ) {
        const d = parseInt(dateString.substring(0, 2), 10);
        const m = parseInt(dateString.substring(3, 5), 10);
        const y = parseInt(dateString.substring(6, 10), 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            return y * 10000 + m * 100 + d;
        }
    }

    // Fallback using Native Date parsing
    const fallbackDate = new Date(dateString);
    if (!isNaN(fallbackDate.getTime())) {
        return fallbackDate.getFullYear() * 10000 + (fallbackDate.getMonth() + 1) * 100 + fallbackDate.getDate();
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
