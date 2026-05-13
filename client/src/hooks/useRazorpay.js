import { useCallback } from 'react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';

const useRazorpay = () => {
  const loadScript = () =>
    new Promise(resolve => {
      if (document.getElementById('razorpay-script')) return resolve(true);
      const script = document.createElement('script');
      script.id = 'razorpay-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const initiatePayment = useCallback(async (transactionId, onSuccess) => {
    const loaded = await loadScript();
    if (!loaded) return toast.error('Payment gateway failed to load');

    try {
      const { data } = await api.post('/api/transactions/payment-order', { transaction_id: transactionId });

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: 'Thrift Marketplace',
        description: 'Secure escrow payment',
        order_id: data.order_id,
        handler: async (response) => {
          try {
            await api.post('/api/transactions/confirm-payment', {
              transaction_id: transactionId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success('Payment successful! Escrow held.');
            if (onSuccess) onSuccess();
          } catch {
            toast.error('Payment verification failed');
          }
        },
        prefill: { name: '', email: '', contact: '' },
        theme: { color: '#22c55e' },
        modal: { ondismiss: () => toast('Payment cancelled') },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not initiate payment');
    }
  }, []);

  return { initiatePayment };
};

export default useRazorpay;
