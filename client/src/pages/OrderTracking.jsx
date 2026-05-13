import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import useRazorpay from '../hooks/useRazorpay';
import EscrowStatus from '../components/EscrowStatus';
import MeetupTimer from '../components/MeetupTimer';
import QRScanner from '../components/QRScanner';

const QRCodeDisplay = ({ value }) => {
  const [QRC, setQRC] = useState(null);
  useEffect(() => {
    import('qrcode.react').then(m => setQRC(() => m.QRCodeSVG || m.default));
  }, []);
  if (!QRC) return <div className="w-40 h-40 bg-gray-100 animate-pulse rounded" />;
  return <QRC value={value} size={160} />;
};

const STATUS_STEPS = ['pending', 'escrow_held', 'in_transit', 'completed'];

const OrderTracking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { initiatePayment } = useRazorpay();

  const [txn, setTxn] = useState(null);
  const [meetup, setMeetup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    delivery_type: 'meetup',
    meetup_time: '',
    meetup_location: '',
  });

  const fetchTransaction = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/transactions/${id}`);
      setTxn(data);
      if (data.meetups?.[0]) setMeetup(data.meetups[0]);
    } catch {
      toast.error('Transaction not found');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchTransaction();
    const interval = setInterval(fetchTransaction, 15000);
    return () => clearInterval(interval);
  }, [fetchTransaction]);

  const isBuyer = txn?.buyer_id === user?.id;
  const isSeller = txn?.seller_id === user?.id;

  const handlePay = () => initiatePayment(txn.id, fetchTransaction);

  const handleSetDelivery = async () => {
    try {
      await api.put(`/api/transactions/${txn.id}/delivery-type`, deliveryForm);
      toast.success('Delivery type set');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not save');
    }
  };

  const handleStartGrace = async () => {
    try {
      await api.post('/api/meetup/start-grace', { transaction_id: txn.id });
      toast.success('Grace timer started');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not start');
    }
  };

  const handleQRScanned = async (hash) => {
    try {
      await api.post('/api/meetup/confirm', { qr_hash: hash, transaction_id: txn.id });
      toast.success('✅ Meetup confirmed! Escrow released.');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.error || 'QR scan failed');
    }
  };

  const fileNoShow = async (role) => {
    try {
      await api.post('/api/meetup/noshow', { transaction_id: txn.id, filed_by_role: role });
      toast.success('No-show filed. Escrow refunded.');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not file no-show');
    }
  };

  const handleConfirmDelivery = async () => {
    try {
      await api.put(`/api/transactions/${txn.id}/confirm-delivery`);
      toast.success('Delivery confirmed!');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not confirm');
    }
  };

  const handleCancel = async () => {
    try {
      await api.put(`/api/transactions/${txn.id}/cancel`);
      toast.success('Transaction cancelled');
      fetchTransaction();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not cancel');
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Loading…</div>;
  if (!txn) return null;

  const listing = txn.listings;
  const currentStep = STATUS_STEPS.indexOf(txn.status);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Order Tracking</h1>
      <p className="text-gray-500 text-sm mb-6">Transaction #{txn.id.slice(0, 8).toUpperCase()}</p>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3 mb-6">
        <img src={listing?.images?.[0]} alt={listing?.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{listing?.title}</p>
          <p className="text-sm text-gray-500">₹{txn.amount?.toLocaleString()} · {txn.type} · {txn.delivery_type}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
          txn.status === 'completed' ? 'bg-green-100 text-green-700' :
          txn.status === 'disputed'  ? 'bg-red-100 text-red-600' :
          txn.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {txn.status.replace('_', ' ')}
        </span>
      </div>

      {!['cancelled','disputed','refunded'].includes(txn.status) && (
        <div className="flex items-center mb-6">
          {['Payment', 'Escrow Held', 'In Transit', 'Complete'].map((label, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                i <= currentStep ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {i < currentStep ? '✓' : i + 1}
              </div>
              {i < 3 && <div className={`flex-1 h-0.5 mx-1 ${i < currentStep ? 'bg-green-500' : 'bg-gray-100'}`} />}
            </div>
          ))}
        </div>
      )}

      <EscrowStatus status={txn.escrow_status} amount={txn.amount} />

      {/* Buyer: Pay step */}
      {isBuyer && txn.status === 'pending' && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3">Complete Payment</h2>
          <p className="text-sm text-gray-500 mb-4">Your payment is held in escrow and only released after a confirmed meetup or delivery.</p>
          <div className="flex gap-2">
            <button onClick={handlePay} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl">
              Pay ₹{txn.amount?.toLocaleString()}
            </button>
            <button onClick={handleCancel} className="px-4 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Seller: choose delivery type after escrow held */}
      {isSeller && txn.status === 'escrow_held' && !meetup && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">Choose Fulfilment</h2>
          <div className="flex gap-2">
            {['meetup', 'delivery'].map(t => (
              <button key={t}
                onClick={() => setDeliveryForm(f => ({ ...f, delivery_type: t }))}
                className={`flex-1 px-4 py-2 rounded-xl border-2 text-sm font-medium capitalize ${
                  deliveryForm.delivery_type === t ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'
                }`}
              >
                {t === 'meetup' ? '🤝 Meetup' : '📦 Delivery'}
              </button>
            ))}
          </div>
          {deliveryForm.delivery_type === 'meetup' && (
            <>
              <input type="datetime-local"
                value={deliveryForm.meetup_time}
                onChange={e => setDeliveryForm(f => ({ ...f, meetup_time: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
              <input type="text" placeholder="Location (e.g. Cafe XYZ, Indore)"
                value={deliveryForm.meetup_location}
                onChange={e => setDeliveryForm(f => ({ ...f, meetup_location: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm" />
            </>
          )}
          <button onClick={handleSetDelivery}
            disabled={deliveryForm.delivery_type === 'meetup' && !deliveryForm.meetup_time}
            className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl">
            Confirm
          </button>
        </div>
      )}

      {/* Meetup flow */}
      {txn.delivery_type === 'meetup' && meetup && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3">📍 Meetup Details</h2>
          <p className="text-sm text-gray-600">
            <span className="font-medium">When:</span> {new Date(meetup.scheduled_time).toLocaleString()}
          </p>
          {meetup.location_note && (
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Where:</span> {meetup.location_note}
            </p>
          )}

          {meetup.status === 'scheduled' && (
            <button onClick={handleStartGrace}
              className="mt-4 w-full border-2 border-green-400 text-green-600 font-semibold py-2.5 rounded-xl hover:bg-green-50">
              Start 15-min Grace Window
            </button>
          )}

          {meetup.status === 'active' && meetup.grace_timer_start && (
            <MeetupTimer startTime={meetup.grace_timer_start} durationMinutes={15} onExpire={fetchTransaction} />
          )}

          {isSeller && meetup.status !== 'completed' && !meetup.qr_used && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">Show this QR to the buyer at the meetup:</p>
              <div className="flex justify-center">
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6">
                  <QRCodeDisplay value={meetup.qr_code} />
                </div>
              </div>
              <p className="text-[10px] font-mono break-all text-gray-300 text-center mt-2">{meetup.qr_code}</p>
            </div>
          )}

          {isBuyer && meetup.status === 'active' && !meetup.qr_used && (
            <button onClick={() => setShowScanner(true)}
              className="mt-4 w-full bg-green-500 text-white font-semibold py-3 rounded-xl hover:bg-green-600">
              📷 Scan Seller's QR Code
            </button>
          )}

          {meetup.status === 'active' && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2 text-center">If the other party didn't show up:</p>
              <div className="flex gap-2">
                {isBuyer && (
                  <button onClick={() => fileNoShow('buyer')}
                    className="flex-1 border border-red-200 text-red-500 text-sm py-2 rounded-xl hover:bg-red-50">
                    Seller Didn't Show
                  </button>
                )}
                {isSeller && (
                  <button onClick={() => fileNoShow('seller')}
                    className="flex-1 border border-red-200 text-red-500 text-sm py-2 rounded-xl hover:bg-red-50">
                    Buyer Didn't Show
                  </button>
                )}
              </div>
            </div>
          )}

          {meetup.status === 'completed' && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-green-700 font-medium text-sm">✅ Meetup completed! Escrow released.</p>
            </div>
          )}
        </div>
      )}

      {/* Delivery flow */}
      {txn.delivery_type === 'delivery' && txn.status === 'in_transit' && isBuyer && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3">📦 Delivery</h2>
          <p className="text-sm text-gray-500 mb-4">Once you've received the item, confirm delivery to release escrow.</p>
          <button onClick={handleConfirmDelivery}
            className="w-full bg-green-500 text-white font-semibold py-3 rounded-xl hover:bg-green-600">
            ✅ Confirm I Received the Item
          </button>
        </div>
      )}

      {txn.status === 'completed' && txn.return_window_end && new Date(txn.return_window_end) > new Date() && (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h3 className="font-semibold text-amber-800 mb-1">⏰ 24hr Return Window Open</h3>
          <p className="text-sm text-amber-700">
            Dispute window closes: {new Date(txn.return_window_end).toLocaleString()}
          </p>
          <button onClick={() => navigate(`/dispute/${txn.id}`)}
            className="mt-3 text-sm border border-amber-400 text-amber-700 px-4 py-1.5 rounded-lg hover:bg-amber-100">
            File a Dispute
          </button>
        </div>
      )}

      {showScanner && (
        <QRScanner onScan={handleQRScanned} onClose={() => setShowScanner(false)} />
      )}
    </div>
  );
};

export default OrderTracking;
