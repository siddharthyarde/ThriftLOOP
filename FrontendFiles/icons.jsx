// icons.jsx — SVG icon set + brand mark (no emojis)
const I = {};

const ico = (paths, viewBox = "0 0 24 24") => ({ size = 18, stroke = 1.6, ...p } = {}) => (
  <svg width={size} height={size} viewBox={viewBox} fill="none" stroke="currentColor"
       strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    {paths}
  </svg>
);

I.Hanger = ico(<>
  <path d="M12 6.5a2 2 0 1 1 2-2c0 1.2-1 1.8-2 2.2-1.3.5-2 1-2 2.3"/>
  <path d="M3 16.5l9-5 9 5"/>
  <path d="M3 16.5h18a1 1 0 0 1 .6 1.8l-9 4.2a2 2 0 0 1-1.2 0l-9-4.2a1 1 0 0 1 .6-1.8z"/>
</>);
I.Search = ico(<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>);
I.Cart   = ico(<><path d="M3 4h2l2.5 12.5a2 2 0 0 0 2 1.5h8a2 2 0 0 0 2-1.6L21 8H6"/><circle cx="10" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></>);
I.Bell   = ico(<><path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 19a2 2 0 0 0 4 0"/></>);
I.Heart  = ({ filled, ...p } = {}) => (
  <svg width={p.size || 18} height={p.size || 18} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20.5s-7.5-4.5-9.3-9.3A5 5 0 0 1 12 6.3a5 5 0 0 1 9.3 4.9C19.5 16 12 20.5 12 20.5z"/>
  </svg>
);
I.Plus   = ico(<><path d="M12 5v14M5 12h14"/></>);
I.Minus  = ico(<><path d="M5 12h14"/></>);
I.Arrow  = ico(<><path d="M5 12h14M13 6l6 6-6 6"/></>);
I.ArrowLeft = ico(<><path d="M19 12H5M11 18l-6-6 6-6"/></>);
I.ArrowUR= ico(<><path d="M7 17 17 7M8 7h9v9"/></>);
I.Close  = ico(<><path d="M6 6l12 12M18 6 6 18"/></>);
I.Filter = ico(<><path d="M3 5h18M6 12h12M10 19h4"/></>);
I.Sort   = ico(<><path d="M7 4v16M3 8l4-4 4 4M17 20V4M21 16l-4 4-4-4"/></>);
I.Pin    = ico(<><path d="M12 22s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></>);
I.Star   = ({ filled, ...p } = {}) => (
  <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
    <path d="m12 2 3 7 7 .8-5.3 4.7L18 22l-6-3.5L6 22l1.3-7.5L2 9.8 9 9z"/>
  </svg>
);
I.Check  = ico(<><path d="m5 12 5 5L20 7"/></>);
I.Verified = ico(<><path d="M12 2 14 4l3-.4.4 3L20 9l-1.5 2.5L20 14l-2.6 1.4L17 18l-3-.4-2 2-2-2-3 .4-.4-2.6L4 14l1.5-2.5L4 9l2.6-1.4L7 5l3 .4z"/><path d="m9 12 2 2 4-4"/></>);
I.Swap   = ico(<><path d="M7 7h12l-3-3M17 17H5l3 3"/></>);
I.Box    = ico(<><path d="M3 7h18l-2 12H5z"/><path d="M3 7l3-4h12l3 4M9 12h6"/></>);
I.Spark  = ico(<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></>);
I.Chat   = ico(<><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/></>);
I.User   = ico(<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>);
I.Eye    = ico(<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>);
I.Bookmark = ico(<><path d="M6 3h12v18l-6-4-6 4z"/></>);
I.Camera = ico(<><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></>);
I.Leaf   = ico(<><path d="M4 20c0-8 6-14 14-14 0 8-6 14-14 14z"/><path d="M4 20 14 10"/></>);
I.Calendar = ico(<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>);
I.Shield  = ico(<><path d="M12 3 4 6v6c0 5 4 8 8 9 4-1 8-4 8-9V6z"/></>);
I.Lock    = ico(<><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></>);
I.Tag     = ico(<><path d="M3 12 12 3h8v8l-9 9z"/><circle cx="15.5" cy="8.5" r="1.2"/></>);
I.Truck   = ico(<><path d="M3 7h11v10H3zM14 10h5l2 3v4h-7"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/></>);
I.Globe   = ico(<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 4 3 14 0 18M12 3c-3 4-3 14 0 18"/></>);
I.Menu    = ico(<><path d="M4 7h16M4 12h16M4 17h16"/></>);
I.Sun     = ico(<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9 6.3 6.3M17.7 17.7l1.4 1.4M4.9 19.1 6.3 17.7M17.7 6.3l1.4-1.4"/></>);
I.Moon    = ico(<><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/></>);
I.Chevron = ico(<><path d="m6 9 6 6 6-6"/></>);
I.ChevronR= ico(<><path d="m9 6 6 6-6 6"/></>);
I.Reload  = ico(<><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5"/></>);
I.Sliders = ico(<><path d="M4 7h12M20 7h0M4 12h4M12 12h8M4 17h12M20 17h0"/><circle cx="18" cy="7" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="17" r="2"/></>);

// Brand mark — hanger + wordmark
const ThriftMark = ({ size = 18, color = "currentColor" }) => (
  <span style={{ display:"inline-flex", alignItems:"baseline", gap: 8, color }}>
    <svg width={size + 2} height={size + 2} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6a2 2 0 1 1 2-2c0 1.3-1.1 1.8-2 2.2-1 .5-1.6 1-1.6 2"/>
      <path d="M3 16.5l9-4.8 9 4.8"/>
      <path d="M3 16.5h18a1 1 0 0 1 .6 1.8l-9 4.2a2 2 0 0 1-1.2 0l-9-4.2a1 1 0 0 1 .6-1.8z" fill="currentColor" fillOpacity=".08"/>
    </svg>
    <span className="serif" style={{ fontSize: size + 8, lineHeight: 1, letterSpacing: "-.02em" }}>thrift</span>
  </span>
);

Object.assign(window, { I, ThriftMark });
