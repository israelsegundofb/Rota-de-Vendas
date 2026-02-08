
interface GeocodeResult {
    lat: number;
    lng: number;
    formattedAddress?: string;
    locationType?: string;
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
                locationType: result.geometry.location_type
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
