const axios = require('axios');

// Virtual try-on: 2 images in (clothing + person), 1 result image URL out.
const tryOn = async (clothingImageUrl, userImageBase64) => {
  const response = await axios.post(process.env.API4AI_ENDPOINT, {
    clothing_image: clothingImageUrl,
    person_image: userImageBase64,
  }, {
    headers: { 'Authorization': `Bearer ${process.env.API4AI_KEY}` },
  });
  return response.data.result_url;
};

module.exports = { tryOn };
