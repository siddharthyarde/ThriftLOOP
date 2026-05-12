// Shiprocket REST API wrapper — delivery orders and tracking.
// Full implementation arrives with the Delivery module.
const axios = require('axios');

const SHIPROCKET_BASE = 'https://apiv2.shiprocket.in/v1/external';

let token = null;

const authenticate = async () => {
  const { data } = await axios.post(`${SHIPROCKET_BASE}/auth/login`, {
    email: process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
  });
  token = data.token;
  return token;
};

module.exports = { authenticate, SHIPROCKET_BASE, getToken: () => token };
