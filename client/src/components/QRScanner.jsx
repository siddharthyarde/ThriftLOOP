import { useState } from 'react';

const QRScanner = ({ onScan, onClose }) => {
  const [manualHash, setManualHash] = useState('');
  const [error, setError] = useState('');

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualHash.trim()) return setError('Enter the QR code hash');
    onScan(manualHash.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Scan QR Code</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="bg-gray-900 rounded-xl aspect-square flex items-center justify-center mb-4">
          <div className="text-center text-gray-400">
            <p className="text-4xl mb-2">📷</p>
            <p className="text-sm">Camera preview</p>
            <p className="text-xs opacity-60">Point at seller's QR code</p>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mb-3">— or enter hash manually —</p>

        <form onSubmit={handleManualSubmit} className="space-y-3">
          <input
            type="text"
            value={manualHash}
            onChange={e => setManualHash(e.target.value)}
            placeholder="Paste QR hash here (for demo)"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full bg-green-500 text-white font-semibold py-2.5 rounded-xl hover:bg-green-600"
          >
            Confirm Scan
          </button>
        </form>
      </div>
    </div>
  );
};

export default QRScanner;
