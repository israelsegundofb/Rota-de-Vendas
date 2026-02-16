import { useCallback } from 'react';

export const useUrlParams = () => {

    // Get a specific param
    const getParam = useCallback((key: string): string | null => {
        const searchParams = new URLSearchParams(window.location.search);
        return searchParams.get(key);
    }, []);

    // Set a specific param (updates URL without reload)
    const setParam = useCallback((key: string, value: string | null | undefined) => {
        const searchParams = new URLSearchParams(window.location.search);

        if (value === null || value === undefined || value === '') {
            searchParams.delete(key);
        } else {
            searchParams.set(key, value);
        }

        const newRelativePathQuery = window.location.pathname + '?' + searchParams.toString();
        window.history.replaceState(null, '', newRelativePathQuery);
    }, []);

    // Clear all params
    const clearParams = useCallback(() => {
        const newRelativePathQuery = window.location.pathname;
        window.history.replaceState(null, '', newRelativePathQuery);
    }, []);

    return { getParam, setParam, clearParams };
};
