const axios = require('axios');
const FormData = require('form-data');

const tryOn = async (clothingImageUrl, userImageBase64) => {
  const formData = new FormData();
  formData.append('url', clothingImageUrl);

  const buffer = Buffer.from(userImageBase64, 'base64');
  formData.append('image', buffer, { filename: 'person.jpg', contentType: 'image/jpeg' });

  const response = await axios.post(
    process.env.API4AI_ENDPOINT || 'https://api4ai.cloud/fashion/virtual-tryon',
    formData,
    {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${process.env.API4AI_KEY}`,
      },
      timeout: 30000,
    }
  );

  const result = response.data?.results?.[0];
  if (!result) throw new Error('Try-on API returned no result');
  return result.url || result.image_url || result.output_url;
};

module.exports = { tryOn };
