const axios = require('axios');

async function validateLocation(location) {
  try {
    const response = await axios.get('https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(location) + '.json', {
      params: {
        access_token: process.env.MAPBOX_API_TOKEN,
        limit: 1
      }
    });

    // Check if any results were returned
    return response.data.features && response.data.features.length > 0;
  } catch (error) {
    console.error('Error validating location:', error);
    return false;
  }
}

module.exports = validateLocation;