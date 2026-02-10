
interface GeocodeResult {
    lat: number;
    lng: number;
    formattedAddress?: string;
    locationType?: string;
    addressComponents?: Array<{
        long_name: string;
        short_name: string;
        types: string[];
    }>;
}

export const geocodeAddress = async (
    address: string,
    apiKey: string
): Promise<GeocodeResult | null> => {
    if (!address || !apiKey) {
        console.warn("Geocoding aborted: Missing address or API key");
        return null;
    }

    try {
        const encodedAddress = encodeURIComponent(address);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.results && data.results.length > 0) {
            const result = data.results[0];
            const location = result.geometry.location;

            return {
                lat: location.lat,
                lng: location.lng,
                formattedAddress: result.formatted_address,
                locationType: result.geometry.location_type,
                addressComponents: result.address_components
            };
        } else {
            console.warn(`Geocoding failed for address "${address}":`, data.status, data.error_message);
            return null;
        }
    } catch (error) {
        console.error(`Geocoding fetch error for address "${address}":`, error);
        return null;
    }
};

export const reverseGeocodePlusCode = async (
    lat: number,
    lng: number,
    apiKey: string
): Promise<string | null> => {
    if (!lat || !lng || !apiKey) {
        return null;
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'OK' && data.plus_code) {
            // Favor compound_code as it often includes the city/state which matches user's preferred format
            return data.plus_code.compound_code || data.plus_code.global_code || null;
        }
        return null;
    } catch (error) {
        console.error("Reverse geocoding error:", error);
        return null;
    }
};
