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
