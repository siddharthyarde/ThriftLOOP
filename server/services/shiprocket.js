const axios = require('axios');

const BASE = 'https://apiv2.shiprocket.in/v1/external';
let token = null;
let tokenExpiry = null;

const authenticate = async () => {
  if (token && tokenExpiry && Date.now() < tokenExpiry) return token;

  const { data } = await axios.post(`${BASE}/auth/login`, {
    email: process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
  });
  token = data.token;
  tokenExpiry = Date.now() + 9 * 24 * 60 * 60 * 1000;
  return token;
};

const createShipment = async ({
  orderId, buyerName, buyerEmail, buyerPhone, buyerAddress, buyerCity, buyerPincode,
  sellerName, sellerAddress, sellerCity, sellerPincode,
  itemName, itemWeight = 0.5, itemPrice,
}) => {
  const t = await authenticate();
  const { data } = await axios.post(
    `${BASE}/orders/create/adhoc`,
    {
      order_id: orderId,
      order_date: new Date().toISOString().split('T')[0],
      pickup_location: 'Primary',
      billing_customer_name: buyerName,
      billing_address: buyerAddress,
      billing_city: buyerCity,
      billing_pincode: buyerPincode,
      billing_country_code: 'IN',
      billing_email: buyerEmail,
      billing_phone: buyerPhone,
      shipping_is_billing: true,
      order_items: [{
        name: itemName,
        sku: `THRIFT-${orderId}`,
        units: 1,
        selling_price: itemPrice,
        weight: itemWeight,
      }],
      payment_method: 'Prepaid',
      sub_total: itemPrice,
      length: 30, breadth: 20, height: 5, weight: itemWeight,
    },
    { headers: { Authorization: `Bearer ${t}` } }
  );
  return data;
};

const trackShipment = async (awb) => {
  const t = await authenticate();
  const { data } = await axios.get(
    `${BASE}/courier/track/awb/${awb}`,
    { headers: { Authorization: `Bearer ${t}` } }
  );
  return data;
};

module.exports = { authenticate, createShipment, trackShipment, BASE };
