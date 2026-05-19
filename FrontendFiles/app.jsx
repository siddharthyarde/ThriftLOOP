// app.jsx — Canvas wiring + Tweaks panel

const { useState: useStateA, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "ink",
  "mode": "light",
  "heroVariant": "collage",
  "cardLayout": "editorial"
}/*EDITMODE-END*/;

// Per-page layout heights
const HEIGHT = {
  home:3200, listing:2200, rent:1600, cart:1500,
  login:1100, register:1200, quiz:1000,
  create:2400, dashboard:2100, profile:1700,
  storefront:2000, swap:2000, chat:1100, tracking:1400,
  dispute:1500, admin:2200,
};
const heightFor = (page) => HEIGHT[page] || 2000;

// Default page per artboard slot — keys must be stable so we don't violate hook rules
const SLOT_DEFAULTS = {
  home:"home", listing:"listing", rent:"rent", cart:"cart",
  login:"login", register:"register", quiz:"quiz",
  create:"create", dashboard:"dashboard", profile:"profile",
  storefront:"storefront", swap:"swap", chat:"chat", tracking:"tracking",
  dispute:"dispute", admin:"admin",
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // ONE state object holds all 16 slot states — avoids useState-in-loop.
  const initial = {};
  for (const [slotId, defaultPage] of Object.entries(SLOT_DEFAULTS)) {
    initial[slotId] = { page: defaultPage, item: null };
  }
  const [slots, setSlots] = useStateA(initial);

  const navFor = (slotId) => (page, item) => {
    if (!page) return;
    setSlots(prev => ({ ...prev, [slotId]: { page, item: item || null } }));
  };

  const renderPage = (slotId) => {
    const state = slots[slotId];
    const onNav = navFor(slotId);
    const props = {
      onNav,
      palette: t.palette === "default" ? null : t.palette,
      mode: t.mode,
      listing: state.item,
    };
    switch (state.page) {
      case "listing":    return <ListingPage         {...props}/>;
      case "rent":       return <RentalPage          {...props}/>;
      case "cart":       return <CartPage            {...props}/>;
      case "login":      return <LoginPage           {...props}/>;
      case "register":   return <RegisterPage        {...props}/>;
      case "quiz":       return <StyleQuizPage       {...props}/>;
      case "create":     return <CreateListingPage   {...props}/>;
      case "dashboard":  return <SellerDashboardPage {...props}/>;
      case "profile":    return <ProfilePage         {...props}/>;
      case "storefront": return <StorefrontPage      {...props}/>;
      case "swap":       return <SwapEnginePage      {...props}/>;
      case "chat":       return <ChatPage            {...props}/>;
      case "tracking":   return <TrackingPage        {...props}/>;
      case "dispute":    return <DisputePage         {...props}/>;
      case "admin":      return <AdminPage           {...props}/>;
      default:
        return <HomePage {...props} heroVariant={t.heroVariant} cardLayout={t.cardLayout}/>;
    }
  };

  // Inline DCArtboard calls — DCSection filters children by exact c.type === DCArtboard
  return (
    <>
      <DesignCanvas>
        <DCSection id="shopper" title="Shopper flow" subtitle="Browse → Listing → Rent → Checkout · clickable inside each artboard">
          <DCArtboard id="home"    label="01 · Home / Browse"  width={1280} height={heightFor(slots.home.page)}>
            <div data-screen-label="01 Home">{renderPage("home")}</div>
          </DCArtboard>
          <DCArtboard id="listing" label="02 · Listing detail" width={1280} height={heightFor(slots.listing.page)}>
            <div data-screen-label="02 Listing">{renderPage("listing")}</div>
          </DCArtboard>
          <DCArtboard id="rent"    label="03 · Rental booking" width={1280} height={heightFor(slots.rent.page)}>
            <div data-screen-label="03 Rental">{renderPage("rent")}</div>
          </DCArtboard>
          <DCArtboard id="cart"    label="04 · Checkout"       width={1280} height={heightFor(slots.cart.page)}>
            <div data-screen-label="04 Checkout">{renderPage("cart")}</div>
          </DCArtboard>
        </DCSection>

        <DCSection id="auth" title="Auth & onboarding" subtitle="Welcoming new and returning users">
          <DCArtboard id="login"    label="05 · Sign in"        width={1280} height={heightFor(slots.login.page)}>
            <div data-screen-label="05 Login">{renderPage("login")}</div>
          </DCArtboard>
          <DCArtboard id="register" label="06 · Create account" width={1280} height={heightFor(slots.register.page)}>
            <div data-screen-label="06 Register">{renderPage("register")}</div>
          </DCArtboard>
          <DCArtboard id="quiz"     label="07 · Style quiz"     width={1280} height={heightFor(slots.quiz.page)}>
            <div data-screen-label="07 Quiz">{renderPage("quiz")}</div>
          </DCArtboard>
        </DCSection>

        <DCSection id="sell" title="Sell & manage" subtitle="Listing, dashboard, profile">
          <DCArtboard id="create"    label="08 · Create listing"   width={1280} height={heightFor(slots.create.page)}>
            <div data-screen-label="08 Create">{renderPage("create")}</div>
          </DCArtboard>
          <DCArtboard id="dashboard" label="09 · Seller dashboard" width={1280} height={heightFor(slots.dashboard.page)}>
            <div data-screen-label="09 Dashboard">{renderPage("dashboard")}</div>
          </DCArtboard>
          <DCArtboard id="profile"   label="10 · My profile"       width={1280} height={heightFor(slots.profile.page)}>
            <div data-screen-label="10 Profile">{renderPage("profile")}</div>
          </DCArtboard>
        </DCSection>

        <DCSection id="engage" title="Engage & transact" subtitle="Stores, swaps, chat, tracking">
          <DCArtboard id="storefront" label="11 · Public storefront" width={1280} height={heightFor(slots.storefront.page)}>
            <div data-screen-label="11 Storefront">{renderPage("storefront")}</div>
          </DCArtboard>
          <DCArtboard id="swap"       label="12 · Swap engine"       width={1280} height={heightFor(slots.swap.page)}>
            <div data-screen-label="12 Swap">{renderPage("swap")}</div>
          </DCArtboard>
          <DCArtboard id="chat"       label="13 · Chat"              width={1280} height={heightFor(slots.chat.page)}>
            <div data-screen-label="13 Chat">{renderPage("chat")}</div>
          </DCArtboard>
          <DCArtboard id="tracking"   label="14 · Order tracking"    width={1280} height={heightFor(slots.tracking.page)}>
            <div data-screen-label="14 Tracking">{renderPage("tracking")}</div>
          </DCArtboard>
        </DCSection>

        <DCSection id="trust" title="Trust & moderation" subtitle="Disputes and admin">
          <DCArtboard id="dispute" label="15 · File a dispute" width={1280} height={heightFor(slots.dispute.page)}>
            <div data-screen-label="15 Dispute">{renderPage("dispute")}</div>
          </DCArtboard>
          <DCArtboard id="admin"   label="16 · Admin panel"    width={1280} height={heightFor(slots.admin.page)}>
            <div data-screen-label="16 Admin">{renderPage("admin")}</div>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel>
        <TweakSection label="Theme"/>
        <TweakColor
          label="Palette"
          value={paletteSwatch(t.palette)}
          options={[paletteSwatch("default"), paletteSwatch("clay"), paletteSwatch("ink"), paletteSwatch("plum")]}
          onChange={(swatch) => setTweak("palette", swatchToKey(swatch))}
        />
        <TweakToggle label="Dark mode" value={t.mode === "dark"} onChange={(v) => setTweak("mode", v ? "dark" : "light")}/>

        <TweakSection label="Home page"/>
        <TweakRadio
          label="Hero layout"
          value={t.heroVariant}
          options={["collage", "split", "type"]}
          onChange={(v) => setTweak("heroVariant", v)}
        />
        <TweakRadio
          label="Card layout"
          value={t.cardLayout}
          options={["editorial", "compact"]}
          onChange={(v) => setTweak("cardLayout", v)}
        />
      </TweaksPanel>
    </>
  );
}

// Palette swatch helpers
const SWATCH = {
  default: ["#2D3A2E", "#B8956A", "#FAF6EE"],
  clay:    ["#8C3B22", "#C56B3C", "#F7F1E8"],
  ink:     ["#171614", "#C8A951", "#F6F4EE"],
  plum:    ["#3F1E40", "#9AAE8A", "#F5F1EC"],
};
const paletteSwatch = (k) => SWATCH[k] || SWATCH.default;
function swatchToKey(s) {
  if (!s) return "default";
  for (const [k, v] of Object.entries(SWATCH)) {
    if (s === v || s[0] === v[0]) return k;
  }
  return "default";
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
