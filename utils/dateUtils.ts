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
 * High-performance date parser that converts known date string formats directly into an integer (YYYYMMDD)
 * without instantiating a Date object or splitting arrays.
 * Provides a fallback to native Date parsing if formats don't match.
 *
 * Performance improvement: Avoids O(N) memory allocations in hot loops.
 */
export const parseDateToInt = (dateString: string | undefined | null): number | null => {
    if (!dateString) return null;

    // Fast path: YYYY-MM-DD
    if (dateString.length >= 10 && dateString[4] === '-' && dateString[7] === '-') {
        const year = parseInt(dateString.substring(0, 4), 10);
        const month = parseInt(dateString.substring(5, 7), 10);
        const day = parseInt(dateString.substring(8, 10), 10);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            return year * 10000 + month * 100 + day;
        }
    }

    // Fast path: DD/MM/YYYY
    if (dateString.length >= 10 && dateString[2] === '/' && dateString[5] === '/') {
        const day = parseInt(dateString.substring(0, 2), 10);
        const month = parseInt(dateString.substring(3, 5), 10);
        const year = parseInt(dateString.substring(6, 10), 10);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            return year * 10000 + month * 100 + day;
        }
    }

    // Fast path: DD-MM-YYYY
    if (dateString.length >= 10 && dateString[2] === '-' && dateString[5] === '-') {
        const day = parseInt(dateString.substring(0, 2), 10);
        const month = parseInt(dateString.substring(3, 5), 10);
        const year = parseInt(dateString.substring(6, 10), 10);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            return year * 10000 + month * 100 + day;
        }
    }

    // Fallback native parse
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    }

    // Secondary fallback for edge cases like DD/MM/YYYY not handled by fast path or native Date
    const dmyMatch = String(dateString).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const month = parseInt(dmyMatch[2], 10);
        const year = parseInt(dmyMatch[3], 10);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            return year * 10000 + month * 100 + day;
        }
    }

    const dmyHyphenMatch = String(dateString).match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
    if (dmyHyphenMatch) {
        const day = parseInt(dmyHyphenMatch[1], 10);
        const month = parseInt(dmyHyphenMatch[2], 10);
        const year = parseInt(dmyHyphenMatch[3], 10);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            return year * 10000 + month * 100 + day;
        }
    }

    return null;
};
