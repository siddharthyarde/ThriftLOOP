import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { formatPrice } from '../components/ListingCard';
import { Photo, Stars, Footer } from '../components/Shared';
import * as I from '../components/Icons';

const PLATFORM_FEE = 49;

function MiniCalendar({ selected, onPick }) {
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const monthName = new Date(view.y, view.m).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const first = new Date(view.y, view.m, 1).getDay();
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  const [from, to] = selected;

  const inRange = (d) => {
    if (!from || !to) return false;
    const t = new Date(view.y, view.m, d).getTime();
    return t > from.getTime() && t < to.getTime();
  };

  const isEnd = (d, end) => end && end.getDate() === d && end.getMonth() === view.m && end.getFullYear() === view.y;

  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button className="icon-btn" onClick={() => setView(v => ({ y: v.m === 0 ? v.y - 1 : v.y, m: (v.m + 11) % 12 }))}>
          <I.ArrowLeft size={16}/>
        </button>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{monthName}</span>
        <button className="icon-btn" onClick={() => setView(v => ({ y: v.m === 11 ? v.y + 1 : v.y, m: (v.m + 1) % 12 }))}>
          <I.Arrow size={16}/>
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6, fontSize: 11, color: 'var(--ink-mute)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', padding: 6 }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i}/>;
          const date = new Date(view.y, view.m, d);
          const isFrom = isEnd(d, from);
          const isTo   = isEnd(d, to);
          const isToday = d === today.getDate() && view.m === today.getMonth() && view.y === today.getFullYear();
          const past = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const within = inRange(d);
          return (
            <button key={i} disabled={past} onClick={() => onPick(date)}
              style={{
                aspectRatio: '1/1', border: 0, borderRadius: 8,
                background: (isFrom || isTo) ? 'var(--primary)' : within ? 'var(--sage)' : 'transparent',
                color: (isFrom || isTo) ? 'var(--primary-ink)' : past ? 'var(--ink-mute)' : 'var(--ink)',
                opacity: past ? .35 : 1,
                fontWeight: (isFrom || isTo) ? 600 : isToday ? 600 : 400,
                fontSize: 13, cursor: past ? 'not-allowed' : 'pointer',
                outline: isToday ? '1px solid var(--accent)' : 'none',
                transition: 'background .15s ease',
              }}>{d}</button>
          );
        })}
      </div>
    </div>
  );
}

function CostRow({ label, v, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: bold ? 17 : 14 }}>
      <span className={bold ? '' : 'muted'} style={{ fontWeight: bold ? 500 : 400 }}>{label}</span>
      <span className={bold ? 'serif' : ''} style={{ fontWeight: bold ? 400 : 500, fontSize: bold ? 22 : 14 }}>{v}</span>
    </div>
  );
}

export default function RentalPage() {
  const { id: listingId } = useParams();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [range, setRange] = useState([null, null]);
  const [shipping, setShipping] = useState('ship');
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    api.get(`/api/listings/${listingId}`)
      .then(r => setListing(r.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [listingId, navigate]);

  const pickDate = (d) => {
    const [f, t] = range;
    if (!f || (f && t)) setRange([d, null]);
    else if (d < f) setRange([d, f]);
    else setRange([f, d]);
  };

  const days = useMemo(() => {
    if (!range[0] || !range[1]) return 0;
    return Math.round((range[1] - range[0]) / 86400000) + 1;
  }, [range]);

  const rentPerDay = listing?.rental_price_per_day || 0;
  const deposit    = listing?.rental_deposit || 0;
  const rental_amt = days * rentPerDay;
  const shipCost   = shipping === 'ship' ? 80 : 0;
  const total      = rental_amt + deposit + shipCost + PLATFORM_FEE;

  const fmt = (d) => d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';

  const handleBook = async () => {
    if (!days) return toast.error('Select rental dates');
    setBooking(true);
    try {
      const { data } = await api.post('/api/rental', {
        listing_id: listingId,
        start_date: range[0].toISOString().split('T')[0],
        end_date:   range[1].toISOString().split('T')[0],
      });
      setRental(data.rental);

      const { data: order } = await api.post('/api/rental/payment-order', { rental_id: data.rental.id });
      await new Promise(res => {
        if (document.getElementById('razorpay-script')) return res(true);
        const s = document.createElement('script');
        s.id = 'razorpay-script'; s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = () => res(true); document.body.appendChild(s);
      });
      const rzp = new window.Razorpay({
        key: order.key_id, amount: order.amount, currency: order.currency,
        name: 'Thrift Marketplace', description: 'Rental payment + deposit',
        order_id: order.order_id,
        handler: async (response) => {
          await api.post('/api/rental/confirm-payment', {
            rental_id: data.rental.id,
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
          });
          toast.success('Rental confirmed!');
          navigate('/');
        },
        theme: { color: '#2D3A2E' },
      });
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  if (loading) return (
    <section style={{ padding: '32px 32px 56px', display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 36 }}>
      <div style={{ height: 500, borderRadius: 18, background: 'var(--surface)', animation: 'pulse 1.5s infinite' }}/>
      <div style={{ height: 500, borderRadius: 18, background: 'var(--surface)', animation: 'pulse 1.5s infinite' }}/>
    </section>
  );

  if (!listing) return null;

  const condGrade = listing.condition_grade || listing.grade || 'A';
  const condLabel = listing.condition_label || listing.gradeLabel || 'Like New';

  return (
    <>
      <div style={{ padding: '24px 32px 8px' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/listing/${listingId}`)}>
          <I.ArrowLeft size={14}/> Back to listing
        </button>
      </div>

      <section style={{ padding: '8px 32px 24px', display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 36 }}>
        {/* Left — item preview */}
        <div className="card" style={{ padding: 20, borderRadius: 18 }}>
          <div style={{ position: 'relative' }}>
            {listing.images?.[0]
              ? <img src={listing.images[0]} alt={listing.title} style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', borderRadius: 14, display: 'block' }}/>
              : <Photo variant="ph-soft" aspect="4/5" style={{ borderRadius: 14 }}/>
            }
            <span className="pill pill-accent" style={{ position: 'absolute', top: 14, left: 14 }}>RENTAL</span>
          </div>
          <div style={{ marginTop: 18 }}>
            <div className="small muted" style={{ marginBottom: 4 }}>{listing.brand}</div>
            <h2 className="serif" style={{ margin: 0, fontSize: 30, letterSpacing: '-.01em' }}>{listing.title}</h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10 }}>
              <span className="serif" style={{ fontSize: 26, color: 'var(--accent)' }}>
                {formatPrice(rentPerDay)}<span style={{ fontSize: 14, color: 'var(--ink-mute)' }}>/day</span>
              </span>
              <span className="pill" style={{ background: 'var(--sage)', borderColor: 'transparent' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700, marginRight: 4 }}>{condGrade}</span>{condLabel}
              </span>
            </div>
            <p className="small muted" style={{ marginTop: 14, lineHeight: 1.55 }}>
              {formatPrice(deposit)} refundable security deposit. Returned in full when the item is sent back in original condition.
            </p>
          </div>

          {/* Seller mini */}
          <div style={{ marginTop: 18, padding: 14, background: 'var(--bg)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            {listing.users?.avatar_url
              ? <img src={listing.users.avatar_url} alt="" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }}/>
              : <Photo variant="ph-soft" style={{ width: 42, height: 42, borderRadius: '50%' }}/>
            }
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 500 }}>
                {listing.users?.name || 'Seller'}
                {listing.users?.verified && <I.Verified size={13} style={{ color: 'var(--accent)' }}/>}
              </div>
              <Stars value={(listing.users?.trust_score || 0) / 20} size={10}/>
            </div>
            <button className="icon-btn"><I.Chat size={18}/></button>
          </div>
        </div>

        {/* Right — booking */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div className="eyebrow">Rent · Step 1 of 2</div>
            <h1 className="serif" style={{ margin: '10px 0 0', fontSize: 44, lineHeight: 1.05, letterSpacing: '-.015em' }}>
              Select your rental dates.
            </h1>
            <p className="muted" style={{ margin: '10px 0 0', fontSize: 14 }}>
              Pick a range — minimum 1 day, maximum 14. Pricing updates as you go.
            </p>
          </div>

          {/* Date display */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card" style={{ padding: 12, borderRadius: 12 }}>
              <div className="small muted" style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase' }}>From</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <I.Calendar size={16}/>
                <span style={{ fontSize: 16 }}>{fmt(range[0])}</span>
              </div>
            </div>
            <div className="card" style={{ padding: 12, borderRadius: 12 }}>
              <div className="small muted" style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase' }}>To</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <I.Calendar size={16}/>
                <span style={{ fontSize: 16 }}>{fmt(range[1])}</span>
              </div>
            </div>
          </div>

          <MiniCalendar selected={range} onPick={pickDate}/>

          {/* Delivery */}
          <div>
            <div className="small muted" style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Delivery</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { id: 'ship', icon: <I.Truck size={18}/>, l: 'Ship it',        s: '2–4 days · ₹80' },
                { id: 'meet', icon: <I.Pin size={18}/>,   l: 'Meet in person', s: `${listing.city || 'Local'} · Free` },
              ].map(opt => (
                <button key={opt.id} onClick={() => setShipping(opt.id)}
                  className="lift"
                  style={{
                    textAlign: 'left', padding: 14, cursor: 'pointer',
                    border: `1.5px solid ${shipping === opt.id ? 'var(--ink)' : 'var(--border)'}`,
                    background: shipping === opt.id ? 'var(--surface)' : 'var(--bg)',
                    borderRadius: 12, display: 'flex', gap: 12, alignItems: 'center',
                    transition: 'all .2s ease',
                  }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: shipping === opt.id ? 'var(--primary)' : 'var(--surface)',
                    color: shipping === opt.id ? 'var(--primary-ink)' : 'var(--ink)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{opt.l}</div>
                    <div className="small muted">{opt.s}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="card" style={{ padding: 20, borderRadius: 14, background: 'var(--surface)' }}>
            <div className="small muted" style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Cost breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <CostRow label={`Rental — ${days || 0} day${days === 1 ? '' : 's'} × ${formatPrice(rentPerDay)}`} v={formatPrice(rental_amt)}/>
              <CostRow label="Security deposit (refundable)" v={formatPrice(deposit)}/>
              <CostRow label={shipping === 'ship' ? 'Shipping (round-trip)' : 'Meetup'} v={shipping === 'ship' ? '₹80' : 'Free'}/>
              <CostRow label={`Platform fee`} v={formatPrice(PLATFORM_FEE)}/>
              <hr className="divider"/>
              <CostRow label="Total today" v={formatPrice(total)} bold/>
            </div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-start', gap: 8, padding: 12, background: 'var(--bg)', borderRadius: 10 }}>
              <I.Lock size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }}/>
              <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
                Payment is held in escrow until the rental period ends. Deposit returns within 48 hours of safe return.
              </p>
            </div>
          </div>

          <button className="btn btn-primary btn-lg" disabled={!days || booking} onClick={handleBook}
            style={{ width: '100%', padding: '16px', opacity: days ? 1 : .5, cursor: days ? 'pointer' : 'not-allowed' }}>
            {booking ? 'Booking…' : 'Continue to checkout'} {!booking && <I.Arrow size={16}/>}
          </button>
        </div>
      </section>

      <Footer/>
    </>
  );
}
