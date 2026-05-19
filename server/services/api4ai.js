const axios = require('axios');
const FormData = require('form-data');

const tryOn = async (clothingImageUrl, userImageBase64) => {
  const formData = new FormData();

  // Person image — sent as binary buffer in the 'image' field
  const personBuffer = Buffer.from(userImageBase64, 'base64');
  formData.append('image', personBuffer, { filename: 'person.jpg', contentType: 'image/jpeg' });

  // Clothing image — sent as a URL in the 'url-apparel' field
  formData.append('url-apparel', clothingImageUrl);

  const endpoint = process.env.TRYON_ENDPOINT || 'https://virtual-try-on7.p.rapidapi.com/results';
  const host     = process.env.TRYON_RAPIDAPI_HOST || 'virtual-try-on7.p.rapidapi.com';
  const key      = process.env.TRYON_RAPIDAPI_KEY  || '';

  const response = await axios.post(endpoint, formData, {
    headers: {
      ...formData.getHeaders(),
      'x-rapidapi-host': host,
      'x-rapidapi-key':  key,
    },
    timeout: 60000,
  });

  // API4AI / RapidAPI response shape: { results: [{ entities: [{ image: { url } }] }] }
  const entities = response.data?.results?.[0]?.entities;
  if (entities?.length) {
    const img = entities[0].image;
    if (img?.url) return img.url;
  }

  // Fallback: flat result shapes
  const flat = response.data?.results?.[0];
  if (!flat) throw new Error('Try-on API returned no result');
  return flat.url || flat.image_url || flat.output_url;
};

module.exports = { tryOn };
