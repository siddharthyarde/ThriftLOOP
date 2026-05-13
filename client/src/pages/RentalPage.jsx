import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../lib/api';

const RentalPage = () => {
  const { id: listingId } = useParams();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [dates, setDates] = useState({ start: '', end: '' });
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    api.get(`/api/listings/${listingId}`)
      .then(r => setListing(r.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [listingId, navigate]);

  const calcBreakdown = () => {
    if (!dates.start || !dates.end || !listing) return null;
    const start = new Date(dates.start);
    const end = new Date(dates.end);
    if (end <= start) return null;
    const days = Math.ceil((end - start) / 86400000);
    const rent_amount = days * listing.rental_price_per_day;
    const deposit = listing.rental_deposit;
    return { days, rent_amount, deposit, total: rent_amount + deposit };
  };

  const breakdown = calcBreakdown();

  const handleBook = async () => {
    if (!breakdown) return toast.error('Select valid dates');
    setBooking(true);
    try {
      const { data } = await api.post('/api/rental', {
        listing_id: listingId,
        start_date: dates.start,
        end_date: dates.end,
      });
      setRental(data.rental);
      toast.success('Rental booked! Proceed to payment.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  const handlePayment = async () => {
    try {
      const { data: order } = await api.post('/api/rental/payment-order', { rental_id: rental.id });

      await new Promise(res => {
        if (document.getElementById('razorpay-script')) return res(true);
        const s = document.createElement('script');
        s.id = 'razorpay-script';
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = () => res(true);
        document.body.appendChild(s);
      });

      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Thrift Marketplace',
        description: 'Rental payment + deposit',
        order_id: order.order_id,
        handler: async (response) => {
          await api.post('/api/rental/confirm-payment', {
            rental_id: rental.id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          toast.success('Rental confirmed!');
          navigate('/');
        },
        theme: { color: '#22c55e' },
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Payment failed');
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Loading…</div>;
  if (!listing) return null;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Rent This Item</h1>
      <p className="text-gray-500 text-sm mb-6">Deposit returned after condition check.</p>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex gap-3 mb-6">
        <img src={listing.images?.[0]} alt={listing.title}
          className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
        <div>
          <p className="font-semibold text-gray-900">{listing.title}</p>
          <p className="text-green-600 font-bold">₹{listing.rental_price_per_day}/day</p>
          <p className="text-xs text-gray-400 mt-1">Security deposit: ₹{listing.rental_deposit}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4 mb-6">
        <h2 className="font-semibold text-gray-800">Select Rental Dates</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start Date</label>
            <input type="date" min={today}
              value={dates.start}
              onChange={e => setDates({ ...dates, start: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End Date</label>
            <input type="date" min={dates.start || today}
              value={dates.end}
              onChange={e => setDates({ ...dates, end: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
        </div>

        {breakdown && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{breakdown.days} days × ₹{listing.rental_price_per_day}</span>
              <span>₹{breakdown.rent_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Security deposit (refundable)</span>
              <span>₹{breakdown.deposit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold text-base border-t border-gray-200 pt-2">
              <span>Total Due Now</span>
              <span className="text-green-600">₹{breakdown.total.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {!rental ? (
        <button onClick={handleBook}
          disabled={!breakdown || booking}
          className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition">
          {booking ? 'Booking…' : '📦 Book Rental'}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-green-700 text-sm font-medium">✅ Booking confirmed! Pay to activate.</p>
          </div>
          <button onClick={handlePayment}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl transition">
            💳 Pay ₹{breakdown?.total.toLocaleString()}
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-4">
        Payment is held in escrow. Deposit is released after the owner verifies the returned item.
      </p>
    </div>
  );
};

export default RentalPage;
