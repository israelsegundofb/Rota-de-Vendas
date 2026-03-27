export const parseDateSafe = (dateString: string | undefined | null): Date | null => {
    if (!dateString) return null;

    // 1. Try generic Date constructor (handles ISO YYYY-MM-DD)
    let date = new Date(dateString);
    if (!isNaN(date.getTime())) return date;

    const strDate = String(dateString);

    // 2. Try DD/MM/YYYY format (Common in Brazil CSVs)
    let firstSep = strDate.indexOf('/');
    if (firstSep > 0) {
        const secondSep = strDate.indexOf('/', firstSep + 1);
        if (secondSep > firstSep) {
            const dayStr = strDate.substring(0, firstSep);
            const monthStr = strDate.substring(firstSep + 1, secondSep);
            const yearStr = strDate.substring(secondSep + 1, secondSep + 5);

            if (dayStr.length <= 2 && monthStr.length <= 2 && yearStr.length === 4) {
                const day = parseInt(dayStr, 10);
                const month = parseInt(monthStr, 10) - 1; // Month is 0-indexed
                const year = parseInt(yearStr, 10);
                date = new Date(year, month, day);
                if (!isNaN(date.getTime())) return date;
            }
        }
    }

    // 3. Try DD-MM-YYYY
    firstSep = strDate.indexOf('-');
    if (firstSep > 0) {
        const secondSep = strDate.indexOf('-', firstSep + 1);
        // Ensure we matched DD-MM-YYYY and not YYYY-MM-DD which generic Date might have failed on
        if (secondSep > firstSep) {
            const dayStr = strDate.substring(0, firstSep);
            const monthStr = strDate.substring(firstSep + 1, secondSep);
            const yearStr = strDate.substring(secondSep + 1, secondSep + 5);

            if (dayStr.length <= 2 && monthStr.length <= 2 && yearStr.length === 4) {
                const day = parseInt(dayStr, 10);
                const month = parseInt(monthStr, 10) - 1;
                const year = parseInt(yearStr, 10);
                date = new Date(year, month, day);
                if (!isNaN(date.getTime())) return date;
            }
        }
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
