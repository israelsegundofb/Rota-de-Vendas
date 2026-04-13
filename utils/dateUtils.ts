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
 * High-performance fast-path for date parsing in hot loops.
 * Converts YYYY-MM-DD or DD/MM/YYYY strings to an integer like YYYYMMDD.
 * Used for direct integer comparisons to avoid allocating Date objects.
 */
export const parseDateToInt = (dateString: string | undefined | null): number | null => {
    if (!dateString) return null;

    // Fast path for ISO: YYYY-MM-DD
    if (dateString.length >= 10 && dateString[4] === '-' && dateString[7] === '-') {
        const y = dateString.substring(0, 4);
        const m = dateString.substring(5, 7);
        const d = dateString.substring(8, 10);
        return parseInt(y + m + d, 10);
    }

    // Fast path for Brazilian: DD/MM/YYYY
    if (dateString.length >= 10 && dateString[2] === '/' && dateString[5] === '/') {
        const d = dateString.substring(0, 2);
        const m = dateString.substring(3, 5);
        const y = dateString.substring(6, 10);
        return parseInt(y + m + d, 10);
    }

    // Fast path for DD-MM-YYYY
    if (dateString.length >= 10 && dateString[2] === '-' && dateString[5] === '-') {
        const d = dateString.substring(0, 2);
        const m = dateString.substring(3, 5);
        const y = dateString.substring(6, 10);
        return parseInt(y + m + d, 10);
    }

    // Fallback using native Date parsing
    let date = new Date(dateString);
    if (isNaN(date.getTime())) {
        // Try parsing unpadded DD/MM/YYYY or DD-MM-YYYY
        const parts = dateString.split('/');
        if (parts.length === 3) {
            date = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        } else {
            const partsHyphen = dateString.split('-');
            if (partsHyphen.length === 3) {
                date = new Date(parseInt(partsHyphen[2], 10), parseInt(partsHyphen[1], 10) - 1, parseInt(partsHyphen[0], 10));
            }
        }
    }

    if (!isNaN(date.getTime())) {
        return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    }

    return null;
};
