const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const supabase = require('../services/supabase');
const shiprocket = require('../services/shiprocket');

router.post('/create', authGuard, async (req, res, next) => {
  try {
    const { transaction_id, buyer_details } = req.body;

    const { data: txn } = await supabase.from('transactions')
      .select(`*, listings(title, price, category)`)
      .eq('id', transaction_id).single();

    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    if (txn.seller_id !== req.user.id) return res.status(403).json({ error: 'Only seller can create shipment' });

    const { data: seller } = await supabase.from('users')
      .select('name, locality').eq('id', req.user.id).single();

    const shipment = await shiprocket.createShipment({
      orderId: `TXN-${txn.id.slice(0, 8)}`,
      buyerName: buyer_details.name,
      buyerEmail: buyer_details.email,
      buyerPhone: buyer_details.phone,
      buyerAddress: buyer_details.address,
      buyerCity: buyer_details.city,
      buyerPincode: buyer_details.pincode,
      sellerName: seller.name,
      sellerAddress: seller.locality || 'Indore',
      sellerCity: seller.locality || 'Indore',
      sellerPincode: '452001',
      itemName: txn.listings?.title || 'Clothing Item',
      itemPrice: txn.amount,
    });

    await supabase.from('transactions').update({
      status: 'in_transit',
      delivery_type: 'delivery',
    }).eq('id', transaction_id);

    res.json({ shipment });
  } catch (err) { next(err); }
});

router.get('/track/:awb', authGuard, async (req, res, next) => {
  try {
    const tracking = await shiprocket.trackShipment(req.params.awb);
    res.json(tracking);
  } catch (err) { next(err); }
});

module.exports = router;
