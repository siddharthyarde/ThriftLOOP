import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import DisputePanel from '../components/DisputePanel';

const DisputeFilePage = () => {
  const { txnId } = useParams();
  const navigate = useNavigate();
  const [txn, setTxn] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/transactions/${txnId}`)
      .then(r => setTxn(r.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [txnId, navigate]);

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Loading…</div>;
  if (!txn) return null;

  return <DisputePanel transaction={txn} onClose={() => navigate(`/order/${txnId}`)} />;
};

export default DisputeFilePage;
