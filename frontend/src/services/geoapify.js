export const GEOAPIFY_API_KEY = 'c8225a20f6a245bfa5308da87c7e1646';

export async function searchAddress(text) {
  if (!text || text.length < 3) return [];
  
  try {
    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(text)}&lang=pt&limit=5&apiKey=${GEOAPIFY_API_KEY}`
    );
    const data = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('Error fetching address from Geoapify:', error);
    return [];
  }
}
