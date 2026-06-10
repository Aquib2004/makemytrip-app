import { useState, useEffect, useRef } from "react";

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const SANDBOX = {
  auth: "https://trav-auth-sandbox.travclan.com/authentication/internal/service/login",
  flights: "https://api-sandbox.travclan.com",
  hotels: "https://hms-external-sandbox.travclan.com",
};

const CREDS = {
  merchant_id: "merqjk7edd5",
  user_id: "566e18109",
  api_key: "c8b3d73f-70b4-4032-99a0-f4854bfd8196",
};

// ── HELPERS ────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const addDays = (d, n) => {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().split("T")[0];
};
const fmt = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// ── MAIN APP ───────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("flights"); // flights | hotels
  const [token, setToken] = useState(null);
  const [authStatus, setAuthStatus] = useState("idle"); // idle | loading | ok | error
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null); // selected flight / hotel
  const [step, setStep] = useState("search"); // search | results | detail | book | confirm

  // Flight form state
  const [flightForm, setFlightForm] = useState({
    from: "DEL", fromCity: "New Delhi",
    to: "BOM", toCity: "Mumbai",
    date: addDays(today(), 3),
    returnDate: addDays(today(), 7),
    tripType: "one-way",
    adults: 1, children: 0, infants: 0,
    cabin: "ECONOMY",
  });

  // Hotel form state
  const [hotelForm, setHotelForm] = useState({
    city: "Mumbai",
    locationId: "",
    checkIn: addDays(today(), 3),
    checkOut: addDays(today(), 5),
    adults: 2, rooms: 1,
  });

  // ── AUTH ──
  const authenticate = async () => {
    setAuthStatus("loading");
    try {
      const res = await fetch(SANDBOX.auth, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(CREDS),
      });
      const data = await res.json();
      const t = data?.data?.access_token || data?.access_token || data?.token;
      if (t) { setToken(t); setAuthStatus("ok"); return t; }
      throw new Error("No token in response");
    } catch (e) {
      setAuthStatus("error");
      // Use demo token for UI showcase
      const demo = "DEMO_TOKEN_" + Date.now();
      setToken(demo);
      return demo;
    }
  };

  useEffect(() => { authenticate(); }, []);

  // ── FLIGHT SEARCH ──
  const searchFlights = async () => {
    setLoading(true); setError(null); setResults(null); setStep("results");
    const t = token || await authenticate();
    try {
      const payload = {
        traceId: "TRACE_" + Date.now(),
        tripType: flightForm.tripType === "one-way" ? "ONE_WAY" : "ROUND_TRIP",
        journeys: [
          { from: flightForm.from, to: flightForm.to, date: flightForm.date },
          ...(flightForm.tripType === "round-trip"
            ? [{ from: flightForm.to, to: flightForm.from, date: flightForm.returnDate }]
            : []),
        ],
        passengers: { adults: flightForm.adults, children: flightForm.children, infants: flightForm.infants },
        cabinClass: flightForm.cabin,
      };
      const res = await fetch(`${SANDBOX.flights}/api/v2/flights/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.data?.flights?.length) {
        setResults({ type: "flights", items: data.data.flights });
      } else {
        setResults({ type: "flights", items: getMockFlights() });
      }
    } catch {
      setResults({ type: "flights", items: getMockFlights() });
    }
    setLoading(false);
  };

  // ── HOTEL SEARCH ──
  const searchHotels = async () => {
    setLoading(true); setError(null); setResults(null); setStep("results");
    const t = token || await authenticate();
    try {
      const res = await fetch(`${SANDBOX.hotels}/hms-external/api/v1/hotels/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          traceId: "TRACE_" + Date.now(),
          locationId: hotelForm.locationId || "city_mumbai",
          checkIn: hotelForm.checkIn,
          checkOut: hotelForm.checkOut,
          rooms: [{ adults: hotelForm.adults }],
        }),
      });
      const data = await res.json();
      if (data?.data?.hotels?.length) {
        setResults({ type: "hotels", items: data.data.hotels });
      } else {
        setResults({ type: "hotels", items: getMockHotels() });
      }
    } catch {
      setResults({ type: "hotels", items: getMockHotels() });
    }
    setLoading(false);
  };

  const handleSearch = () => tab === "flights" ? searchFlights() : searchHotels();

  const resetSearch = () => { setStep("search"); setResults(null); setSelected(null); setError(null); };

  // ── RENDER ──
  return (
    <div style={styles.root}>
      {/* NAV */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <div style={styles.logo}>
            <span style={styles.logoM}>make</span>
            <span style={styles.logoY}>my</span>
            <span style={styles.logoT}>trip</span>
          </div>
          <div style={styles.navLinks}>
            {["Flights", "Hotels", "Holidays", "Trains", "Buses"].map(l => (
              <span key={l} style={{ ...styles.navLink, ...(l.toLowerCase() === tab || (l === "Flights" && tab === "flights") ? styles.navLinkActive : {}) }}
                onClick={() => { if (l === "Flights") { setTab("flights"); resetSearch(); } if (l === "Hotels") { setTab("hotels"); resetSearch(); } }}>
                {l === "Flights" ? "✈ " : l === "Hotels" ? "🏨 " : l === "Holidays" ? "🌴 " : l === "Trains" ? "🚄 " : "🚌 "}{l}
              </span>
            ))}
          </div>
          <div style={styles.authBadge}>
            <span style={{ ...styles.dot, background: authStatus === "ok" ? "#22c55e" : authStatus === "loading" ? "#f59e0b" : "#ef4444" }} />
            {authStatus === "ok" ? "API Connected" : authStatus === "loading" ? "Connecting…" : "Demo Mode"}
          </div>
        </div>
      </nav>

      {/* HERO */}
      {step === "search" && (
        <div style={styles.hero}>
          <div style={styles.heroOverlay} />
          <div style={styles.heroContent}>
            <h1 style={styles.heroTitle}>
              {tab === "flights" ? "Where will you fly next?" : "Find your perfect stay"}
            </h1>
            <p style={styles.heroSub}>
              {tab === "flights"
                ? "Search 500+ airlines · Best prices · Instant booking"
                : "1M+ properties · Free cancellation · Best price guarantee"}
            </p>

            {/* SEARCH BOX */}
            <div style={styles.searchBox}>
              {/* TAB SWITCHER */}
              <div style={styles.searchTabs}>
                {["flights", "hotels"].map(t2 => (
                  <button key={t2} style={{ ...styles.searchTab, ...(tab === t2 ? styles.searchTabActive : {}) }}
                    onClick={() => { setTab(t2); resetSearch(); }}>
                    {t2 === "flights" ? "✈ Flights" : "🏨 Hotels"}
                  </button>
                ))}
              </div>

              {tab === "flights" ? (
                <FlightForm form={flightForm} setForm={setFlightForm} />
              ) : (
                <HotelForm form={hotelForm} setForm={setHotelForm} />
              )}

              <button style={styles.searchBtn} onClick={handleSearch}>
                🔍 Search {tab === "flights" ? "Flights" : "Hotels"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS */}
      {step === "results" && (
        <div style={styles.resultsPage}>
          <div style={styles.resultsHeader}>
            <button style={styles.backBtn} onClick={resetSearch}>← Modify Search</button>
            <div style={styles.resultsTitle}>
              {tab === "flights"
                ? `${flightForm.fromCity} → ${flightForm.toCity} · ${fmt(flightForm.date)}`
                : `Hotels in ${hotelForm.city} · ${fmt(hotelForm.checkIn)} – ${fmt(hotelForm.checkOut)}`}
            </div>
          </div>

          {loading ? (
            <div style={styles.loadingWrap}>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>Searching best {tab === "flights" ? "flights" : "hotels"} for you…</p>
            </div>
          ) : results?.items?.length ? (
            <div style={styles.resultsList}>
              {results.items.map((item, i) =>
                tab === "flights"
                  ? <FlightCard key={i} flight={item} onSelect={() => { setSelected(item); setStep("detail"); }} />
                  : <HotelCard key={i} hotel={item} onSelect={() => { setSelected(item); setStep("detail"); }} />
              )}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🔍</div>
              <h3>No results found</h3>
              <p>Try adjusting your search criteria</p>
              <button style={styles.searchBtn} onClick={resetSearch}>Modify Search</button>
            </div>
          )}
        </div>
      )}

      {/* DETAIL */}
      {step === "detail" && selected && (
        <DetailView
          item={selected}
          type={tab}
          form={tab === "flights" ? flightForm : hotelForm}
          onBack={() => setStep("results")}
          onBook={() => setStep("book")}
        />
      )}

      {/* BOOKING */}
      {step === "book" && selected && (
        <BookingForm
          item={selected}
          type={tab}
          onBack={() => setStep("detail")}
          onConfirm={() => setStep("confirm")}
        />
      )}

      {/* CONFIRMATION */}
      {step === "confirm" && (
        <ConfirmationPage type={tab} item={selected} onReset={resetSearch} />
      )}

      {/* FEATURES SECTION */}
      {step === "search" && <FeaturesSection />}

      {/* FOOTER */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerLogo}>
            <span style={styles.logoM}>make</span><span style={styles.logoY}>my</span><span style={styles.logoT}>trip</span>
          </div>
          <p style={styles.footerNote}>Powered by TravClan Volt API · Built for interview demo</p>
          <p style={styles.footerNote}>© 2026 MakeMyTrip Clone · All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}

// ── FLIGHT FORM ─────────────────────────────────────────────────────────────
function FlightForm({ form, setForm }) {
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div>
      <div style={styles.tripTypeRow}>
        {["one-way", "round-trip"].map(t => (
          <label key={t} style={styles.radioLabel}>
            <input type="radio" checked={form.tripType === t} onChange={() => update("tripType", t)} style={{ marginRight: 6 }} />
            {t === "one-way" ? "One Way" : "Round Trip"}
          </label>
        ))}
      </div>
      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label style={styles.label}>FROM</label>
          <div style={styles.airportBox}>
            <div style={styles.airportCode}>{form.from}</div>
            <input style={styles.airportInput} value={form.fromCity}
              onChange={e => update("fromCity", e.target.value)}
              placeholder="City or Airport" />
          </div>
        </div>
        <div style={styles.swapBtn} onClick={() => setForm(p => ({ ...p, from: p.to, to: p.from, fromCity: p.toCity, toCity: p.fromCity }))}>⇄</div>
        <div style={styles.formGroup}>
          <label style={styles.label}>TO</label>
          <div style={styles.airportBox}>
            <div style={styles.airportCode}>{form.to}</div>
            <input style={styles.airportInput} value={form.toCity}
              onChange={e => update("toCity", e.target.value)}
              placeholder="City or Airport" />
          </div>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>DEPARTURE</label>
          <input type="date" style={styles.dateInput} value={form.date} min={today()}
            onChange={e => update("date", e.target.value)} />
        </div>
        {form.tripType === "round-trip" && (
          <div style={styles.formGroup}>
            <label style={styles.label}>RETURN</label>
            <input type="date" style={styles.dateInput} value={form.returnDate} min={form.date}
              onChange={e => update("returnDate", e.target.value)} />
          </div>
        )}
        <div style={styles.formGroup}>
          <label style={styles.label}>TRAVELLERS & CLASS</label>
          <select style={styles.selectInput} value={form.adults} onChange={e => update("adults", +e.target.value)}>
            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Adult{n>1?"s":""}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ── HOTEL FORM ──────────────────────────────────────────────────────────────
function HotelForm({ form, setForm }) {
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div style={styles.formRow}>
      <div style={{ ...styles.formGroup, flex: 2 }}>
        <label style={styles.label}>CITY / AREA / PROPERTY</label>
        <input style={styles.textInput} value={form.city}
          onChange={e => update("city", e.target.value)} placeholder="Enter city, area or hotel name" />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>CHECK-IN</label>
        <input type="date" style={styles.dateInput} value={form.checkIn} min={today()}
          onChange={e => update("checkIn", e.target.value)} />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>CHECK-OUT</label>
        <input type="date" style={styles.dateInput} value={form.checkOut} min={form.checkIn}
          onChange={e => update("checkOut", e.target.value)} />
      </div>
      <div style={styles.formGroup}>
        <label style={styles.label}>ROOMS & GUESTS</label>
        <select style={styles.selectInput} value={form.rooms} onChange={e => update("rooms", +e.target.value)}>
          {[1,2,3,4].map(n => <option key={n} value={n}>{n} Room{n>1?"s":""}, {form.adults} Adult{form.adults>1?"s":""}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── FLIGHT CARD ─────────────────────────────────────────────────────────────
function FlightCard({ flight, onSelect }) {
  return (
    <div style={styles.card} onClick={onSelect}>
      <div style={styles.cardLeft}>
        <div style={styles.airlineLogo}>{flight.airline?.slice(0,2)?.toUpperCase() || "AI"}</div>
        <div>
          <div style={styles.airlineName}>{flight.airline || "Air India"}</div>
          <div style={styles.flightNo}>{flight.flightNumber || "AI-" + Math.floor(Math.random()*900+100)}</div>
        </div>
      </div>
      <div style={styles.cardMid}>
        <div style={styles.timeBlock}>
          <div style={styles.time}>{flight.departure || "06:00"}</div>
          <div style={styles.airport}>{flight.from || "DEL"}</div>
        </div>
        <div style={styles.durationBlock}>
          <div style={styles.duration}>{flight.duration || "2h 10m"}</div>
          <div style={styles.durationLine}>──────────</div>
          <div style={styles.stops}>{flight.stops === 0 ? "Non-stop" : flight.stops + " stop"}</div>
        </div>
        <div style={styles.timeBlock}>
          <div style={styles.time}>{flight.arrival || "08:10"}</div>
          <div style={styles.airport}>{flight.to || "BOM"}</div>
        </div>
      </div>
      <div style={styles.cardRight}>
        <div style={styles.price}>₹{(flight.price || Math.floor(Math.random()*5000+3000)).toLocaleString("en-IN")}</div>
        <div style={styles.perPax}>per adult</div>
        <button style={styles.bookBtn}>Book Now</button>
      </div>
    </div>
  );
}

// ── HOTEL CARD ──────────────────────────────────────────────────────────────
function HotelCard({ hotel, onSelect }) {
  const stars = hotel.stars || Math.floor(Math.random() * 2 + 3);
  return (
    <div style={styles.hotelCard} onClick={onSelect}>
      <div style={styles.hotelImg}>
        <div style={styles.hotelImgPlaceholder}>🏨</div>
        <div style={styles.hotelStars}>{"★".repeat(stars)}</div>
      </div>
      <div style={styles.hotelInfo}>
        <div style={styles.hotelName}>{hotel.name || "Grand Hyatt Mumbai"}</div>
        <div style={styles.hotelLocation}>📍 {hotel.location || "BKC, Mumbai"}</div>
        <div style={styles.hotelAmenities}>
          {["Free WiFi", "Pool", "Spa", "Restaurant"].map(a => (
            <span key={a} style={styles.amenityTag}>{a}</span>
          ))}
        </div>
        <div style={styles.hotelRating}>
          <span style={styles.ratingBadge}>{(hotel.rating || (Math.random() * 1 + 4).toFixed(1))}</span>
          <span style={styles.ratingLabel}>Excellent</span>
          <span style={styles.reviewCount}>{Math.floor(Math.random() * 2000 + 500)} reviews</span>
        </div>
      </div>
      <div style={styles.hotelPriceBlock}>
        <div style={styles.hotelPrice}>₹{(hotel.price || Math.floor(Math.random() * 8000 + 4000)).toLocaleString("en-IN")}</div>
        <div style={styles.perNight}>per night</div>
        <div style={styles.taxNote}>+ taxes & fees</div>
        <button style={styles.bookBtn}>View Rooms</button>
      </div>
    </div>
  );
}

// ── DETAIL VIEW ─────────────────────────────────────────────────────────────
function DetailView({ item, type, form, onBack, onBook }) {
  return (
    <div style={styles.detailPage}>
      <button style={styles.backBtn} onClick={onBack}>← Back to results</button>
      <div style={styles.detailCard}>
        <h2 style={styles.detailTitle}>
          {type === "flights"
            ? `${item.airline || "Air India"} · ${form.fromCity} → ${form.toCity}`
            : item.name || "Grand Hyatt Mumbai"}
        </h2>
        <div style={styles.detailGrid}>
          {type === "flights" ? (
            <>
              <DetailRow label="Flight" value={item.flightNumber || "AI-542"} />
              <DetailRow label="Departure" value={`${item.departure || "06:00"} · ${fmt(form.date)}`} />
              <DetailRow label="Arrival" value={item.arrival || "08:10"} />
              <DetailRow label="Duration" value={item.duration || "2h 10m"} />
              <DetailRow label="Class" value={form.cabin} />
              <DetailRow label="Baggage" value="15 kg check-in · 7 kg cabin" />
              <DetailRow label="Meal" value="Complimentary" />
              <DetailRow label="Refundable" value="Yes (with charges)" />
            </>
          ) : (
            <>
              <DetailRow label="Location" value={item.location || "BKC, Mumbai"} />
              <DetailRow label="Check-in" value={fmt(form.checkIn)} />
              <DetailRow label="Check-out" value={fmt(form.checkOut)} />
              <DetailRow label="Rooms" value={`${form.rooms} room(s), ${form.adults} adult(s)`} />
              <DetailRow label="Amenities" value="Pool · Spa · Restaurant · Free WiFi" />
              <DetailRow label="Cancellation" value="Free cancellation till 24h before check-in" />
            </>
          )}
        </div>
        <div style={styles.detailFooter}>
          <div>
            <div style={styles.detailPrice}>
              ₹{(item.price || Math.floor(Math.random() * 5000 + 3000)).toLocaleString("en-IN")}
            </div>
            <div style={styles.perPax}>per {type === "flights" ? "adult" : "night"} + taxes</div>
          </div>
          <button style={styles.bookBtn2} onClick={onBook}>Proceed to Book →</button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value}</span>
    </div>
  );
}

// ── BOOKING FORM ─────────────────────────────────────────────────────────────
function BookingForm({ item, type, onBack, onConfirm }) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    dob: "", passport: "", gender: "M",
  });
  const [submitting, setSubmitting] = useState(false);
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.firstName || !form.email || !form.phone) return alert("Please fill required fields");
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1500)); // Simulate API call
    setSubmitting(false);
    onConfirm();
  };

  return (
    <div style={styles.detailPage}>
      <button style={styles.backBtn} onClick={onBack}>← Back</button>
      <div style={styles.detailCard}>
        <h2 style={styles.detailTitle}>Passenger Details</h2>
        <div style={styles.bookingFormGrid}>
          {[
            { k: "firstName", label: "First Name *", type: "text" },
            { k: "lastName", label: "Last Name *", type: "text" },
            { k: "email", label: "Email *", type: "email" },
            { k: "phone", label: "Phone *", type: "tel" },
            { k: "dob", label: "Date of Birth", type: "date" },
            { k: "passport", label: "Passport Number", type: "text" },
          ].map(({ k, label, type: t }) => (
            <div key={k} style={styles.bookingField}>
              <label style={styles.label}>{label}</label>
              <input style={styles.bookingInput} type={t} value={form[k]}
                onChange={e => update(k, e.target.value)} />
            </div>
          ))}
        </div>

        <div style={styles.priceSummary}>
          <h3 style={styles.summaryTitle}>Price Summary</h3>
          <div style={styles.summaryRow}>
            <span>Base Fare</span>
            <span>₹{(item.price || 4500).toLocaleString("en-IN")}</span>
          </div>
          <div style={styles.summaryRow}>
            <span>Taxes & Fees</span>
            <span>₹{Math.floor((item.price || 4500) * 0.18).toLocaleString("en-IN")}</span>
          </div>
          <div style={{ ...styles.summaryRow, fontWeight: 700, borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
            <span>Total</span>
            <span style={{ color: "#2563eb" }}>₹{Math.floor((item.price || 4500) * 1.18).toLocaleString("en-IN")}</span>
          </div>
        </div>

        <button style={{ ...styles.bookBtn2, opacity: submitting ? 0.7 : 1 }}
          onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Processing…" : "Confirm & Pay →"}
        </button>
      </div>
    </div>
  );
}

// ── CONFIRMATION ─────────────────────────────────────────────────────────────
function ConfirmationPage({ type, item, onReset }) {
  const pnr = "TC" + Math.floor(Math.random() * 9000000 + 1000000);
  return (
    <div style={styles.confirmPage}>
      <div style={styles.confirmCard}>
        <div style={styles.confirmIcon}>✅</div>
        <h2 style={styles.confirmTitle}>Booking Confirmed!</h2>
        <p style={styles.confirmSub}>Your {type === "flights" ? "flight" : "hotel"} has been booked successfully.</p>
        <div style={styles.pnrBox}>
          <div style={styles.pnrLabel}>Booking Reference</div>
          <div style={styles.pnrCode}>{pnr}</div>
        </div>
        <div style={styles.confirmDetails}>
          <p>📧 Confirmation sent to your email</p>
          <p>📱 SMS sent to your mobile</p>
        </div>
        <button style={styles.bookBtn2} onClick={onReset}>Book Another</button>
      </div>
    </div>
  );
}

// ── FEATURES SECTION ─────────────────────────────────────────────────────────
function FeaturesSection() {
  const features = [
    { icon: "🛡️", title: "Secure Booking", desc: "256-bit SSL encryption on all transactions" },
    { icon: "💰", title: "Best Price Guarantee", desc: "Found cheaper? We'll match + give extra discount" },
    { icon: "🔄", title: "Easy Cancellation", desc: "Hassle-free cancellations with instant refunds" },
    { icon: "🎧", title: "24/7 Support", desc: "Round the clock customer support" },
  ];
  return (
    <div style={styles.features}>
      <h2 style={styles.featuresTitle}>Why book with us?</h2>
      <div style={styles.featuresGrid}>
        {features.map(f => (
          <div key={f.title} style={styles.featureCard}>
            <div style={styles.featureIcon}>{f.icon}</div>
            <h3 style={styles.featureTitle}>{f.title}</h3>
            <p style={styles.featureDesc}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MOCK DATA ─────────────────────────────────────────────────────────────────
function getMockFlights() {
  return [
    { airline: "Air India", flightNumber: "AI-542", departure: "06:00", arrival: "08:10", duration: "2h 10m", stops: 0, from: "DEL", to: "BOM", price: 4250 },
    { airline: "IndiGo", flightNumber: "6E-301", departure: "09:15", arrival: "11:30", duration: "2h 15m", stops: 0, from: "DEL", to: "BOM", price: 3890 },
    { airline: "SpiceJet", flightNumber: "SG-118", departure: "12:40", arrival: "15:05", duration: "2h 25m", stops: 0, from: "DEL", to: "BOM", price: 3540 },
    { airline: "Vistara", flightNumber: "UK-955", departure: "16:30", arrival: "18:45", duration: "2h 15m", stops: 0, from: "DEL", to: "BOM", price: 5100 },
    { airline: "Go First", flightNumber: "G8-116", departure: "20:00", arrival: "22:15", duration: "2h 15m", stops: 0, from: "DEL", to: "BOM", price: 3200 },
  ];
}

function getMockHotels() {
  return [
    { name: "Grand Hyatt Mumbai", location: "BKC, Mumbai", stars: 5, rating: "4.6", price: 12500 },
    { name: "Trident Nariman Point", location: "Nariman Point, Mumbai", stars: 5, rating: "4.7", price: 9800 },
    { name: "ITC Maratha", location: "Andheri East, Mumbai", stars: 5, rating: "4.5", price: 8900 },
    { name: "The Oberoi Mumbai", location: "Nariman Point, Mumbai", stars: 5, rating: "4.8", price: 15200 },
    { name: "Novotel Mumbai Juhu Beach", location: "Juhu, Mumbai", stars: 4, rating: "4.3", price: 6500 },
    { name: "Radisson Blu Mumbai", location: "Worli, Mumbai", stars: 4, rating: "4.2", price: 5800 },
  ];
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = {
  root: { fontFamily: "'Segoe UI', system-ui, sans-serif", minHeight: "100vh", background: "#f8fafc", color: "#1e293b" },

  // NAV
  nav: { background: "#fff", boxShadow: "0 1px 8px rgba(0,0,0,0.08)", position: "sticky", top: 0, zIndex: 100 },
  navInner: { maxWidth: 1200, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 32 },
  logo: { fontSize: 22, fontWeight: 800, letterSpacing: -1 },
  logoM: { color: "#e63946" }, logoY: { color: "#2563eb" }, logoT: { color: "#1e293b" },
  navLinks: { display: "flex", gap: 4, flex: 1 },
  navLink: { padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#64748b", transition: "all .15s" },
  navLinkActive: { background: "#eff6ff", color: "#2563eb", fontWeight: 600 },
  authBadge: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b", padding: "4px 10px", background: "#f1f5f9", borderRadius: 20 },
  dot: { width: 8, height: 8, borderRadius: "50%", display: "inline-block" },

  // HERO
  hero: { position: "relative", minHeight: 420, background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #0ea5e9 100%)", display: "flex", alignItems: "center" },
  heroOverlay: { position: "absolute", inset: 0, background: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 20\"><path d=\"M0 10 Q25 0 50 10 Q75 20 100 10 L100 20 L0 20Z\" fill=\"rgba(255,255,255,0.05)\"/></svg>') bottom/cover no-repeat" },
  heroContent: { position: "relative", maxWidth: 1200, margin: "0 auto", padding: "40px 24px", width: "100%" },
  heroTitle: { color: "#fff", fontSize: 36, fontWeight: 800, margin: "0 0 8px", letterSpacing: -1 },
  heroSub: { color: "rgba(255,255,255,0.8)", fontSize: 16, margin: "0 0 28px" },

  // SEARCH BOX
  searchBox: { background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" },
  searchTabs: { display: "flex", gap: 8, marginBottom: 20 },
  searchTab: { padding: "8px 20px", borderRadius: 8, border: "2px solid #e2e8f0", background: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#64748b" },
  searchTabActive: { border: "2px solid #2563eb", color: "#2563eb", background: "#eff6ff" },
  tripTypeRow: { display: "flex", gap: 20, marginBottom: 16 },
  radioLabel: { display: "flex", alignItems: "center", fontSize: 14, fontWeight: 500, cursor: "pointer", color: "#475569" },
  formRow: { display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" },
  formGroup: { flex: 1, minWidth: 140 },
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" },
  airportBox: { border: "2px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", background: "#f8fafc", cursor: "pointer", transition: "border .15s" },
  airportCode: { fontSize: 24, fontWeight: 800, color: "#1e293b", lineHeight: 1 },
  airportInput: { border: "none", background: "none", fontSize: 13, color: "#64748b", width: "100%", outline: "none", marginTop: 2 },
  swapBtn: { width: 36, height: 36, borderRadius: "50%", background: "#2563eb", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, fontWeight: 700, alignSelf: "flex-end", marginBottom: 2, flexShrink: 0 },
  dateInput: { border: "2px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 14, width: "100%", outline: "none", color: "#1e293b", background: "#f8fafc", boxSizing: "border-box" },
  textInput: { border: "2px solid #e2e8f0", borderRadius: 8, padding: "12px 14px", fontSize: 14, width: "100%", outline: "none", color: "#1e293b", background: "#f8fafc", boxSizing: "border-box" },
  selectInput: { border: "2px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 14, width: "100%", outline: "none", color: "#1e293b", background: "#f8fafc", boxSizing: "border-box" },
  searchBtn: { display: "block", margin: "20px auto 0", background: "linear-gradient(135deg, #e63946, #dc2626)", color: "#fff", border: "none", borderRadius: 10, padding: "14px 48px", fontSize: 16, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5 },

  // RESULTS
  resultsPage: { maxWidth: 1200, margin: "0 auto", padding: "24px 24px" },
  resultsHeader: { display: "flex", alignItems: "center", gap: 16, marginBottom: 24 },
  resultsTitle: { fontSize: 18, fontWeight: 700, color: "#1e293b" },
  backBtn: { background: "none", border: "2px solid #e2e8f0", borderRadius: 8, padding: "8px 16px", fontSize: 14, cursor: "pointer", color: "#2563eb", fontWeight: 600 },
  resultsList: { display: "flex", flexDirection: "column", gap: 12 },

  // LOADING
  loadingWrap: { textAlign: "center", padding: 80 },
  spinner: { width: 48, height: 48, border: "4px solid #e2e8f0", borderTop: "4px solid #2563eb", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 1s linear infinite" },
  loadingText: { color: "#64748b", fontSize: 16 },

  // EMPTY
  emptyState: { textAlign: "center", padding: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },

  // FLIGHT CARD
  card: { background: "#fff", borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", gap: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", cursor: "pointer", border: "2px solid transparent", transition: "all .15s" },
  cardLeft: { display: "flex", alignItems: "center", gap: 12, minWidth: 140 },
  airlineLogo: { width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg, #2563eb, #0ea5e9)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 },
  airlineName: { fontSize: 14, fontWeight: 700, color: "#1e293b" },
  flightNo: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  cardMid: { flex: 1, display: "flex", alignItems: "center", gap: 16, justifyContent: "center" },
  timeBlock: { textAlign: "center" },
  time: { fontSize: 22, fontWeight: 800, color: "#1e293b" },
  airport: { fontSize: 12, color: "#94a3b8", fontWeight: 600 },
  durationBlock: { textAlign: "center", flex: 1 },
  duration: { fontSize: 13, color: "#64748b", fontWeight: 600 },
  durationLine: { color: "#cbd5e1", fontSize: 10, letterSpacing: -2 },
  stops: { fontSize: 11, color: "#22c55e", fontWeight: 700 },
  cardRight: { textAlign: "right", minWidth: 120 },
  price: { fontSize: 24, fontWeight: 800, color: "#1e293b" },
  perPax: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  bookBtn: { marginTop: 10, background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" },

  // HOTEL CARD
  hotelCard: { background: "#fff", borderRadius: 12, display: "flex", gap: 0, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", cursor: "pointer", overflow: "hidden", border: "2px solid transparent", transition: "all .15s" },
  hotelImg: { width: 200, background: "linear-gradient(135deg, #1e3a5f, #2563eb)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 },
  hotelImgPlaceholder: { fontSize: 48 },
  hotelStars: { color: "#fbbf24", fontSize: 14, marginTop: 8 },
  hotelInfo: { flex: 1, padding: "20px 24px" },
  hotelName: { fontSize: 18, fontWeight: 700, color: "#1e293b", marginBottom: 4 },
  hotelLocation: { fontSize: 13, color: "#64748b", marginBottom: 12 },
  hotelAmenities: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  amenityTag: { background: "#f1f5f9", color: "#475569", fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20 },
  hotelRating: { display: "flex", alignItems: "center", gap: 8 },
  ratingBadge: { background: "#15803d", color: "#fff", fontSize: 13, fontWeight: 700, padding: "3px 8px", borderRadius: 6 },
  ratingLabel: { fontSize: 13, fontWeight: 600, color: "#1e293b" },
  reviewCount: { fontSize: 12, color: "#94a3b8" },
  hotelPriceBlock: { padding: "20px 24px", textAlign: "right", borderLeft: "1px solid #f1f5f9", minWidth: 160 },
  hotelPrice: { fontSize: 24, fontWeight: 800, color: "#1e293b" },
  perNight: { fontSize: 12, color: "#64748b" },
  taxNote: { fontSize: 11, color: "#94a3b8", marginBottom: 12 },

  // DETAIL
  detailPage: { maxWidth: 900, margin: "0 auto", padding: "24px 24px" },
  detailCard: { background: "#fff", borderRadius: 16, padding: 32, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" },
  detailTitle: { fontSize: 22, fontWeight: 800, color: "#1e293b", marginBottom: 24 },
  detailGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 },
  detailRow: { display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f1f5f9" },
  detailLabel: { fontSize: 13, color: "#64748b", fontWeight: 600 },
  detailValue: { fontSize: 13, color: "#1e293b", fontWeight: 700 },
  detailFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingTop: 24, borderTop: "1px solid #f1f5f9" },
  detailPrice: { fontSize: 30, fontWeight: 800, color: "#1e293b" },
  bookBtn2: { background: "linear-gradient(135deg, #e63946, #dc2626)", color: "#fff", border: "none", borderRadius: 10, padding: "14px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer" },

  // BOOKING
  bookingFormGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 },
  bookingField: {},
  bookingInput: { border: "2px solid #e2e8f0", borderRadius: 8, padding: "12px 14px", fontSize: 14, width: "100%", outline: "none", color: "#1e293b", boxSizing: "border-box", marginTop: 4 },
  priceSummary: { background: "#f8fafc", borderRadius: 12, padding: "20px 24px", marginBottom: 24 },
  summaryTitle: { fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#1e293b" },
  summaryRow: { display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14 },

  // CONFIRM
  confirmPage: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: 24 },
  confirmCard: { background: "#fff", borderRadius: 20, padding: 48, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.1)", maxWidth: 480, width: "100%" },
  confirmIcon: { fontSize: 64, marginBottom: 16 },
  confirmTitle: { fontSize: 28, fontWeight: 800, color: "#15803d", marginBottom: 8 },
  confirmSub: { color: "#64748b", marginBottom: 24 },
  pnrBox: { background: "#f0fdf4", border: "2px solid #bbf7d0", borderRadius: 12, padding: 20, marginBottom: 20 },
  pnrLabel: { fontSize: 12, color: "#64748b", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" },
  pnrCode: { fontSize: 28, fontWeight: 800, color: "#15803d", letterSpacing: 3, marginTop: 4 },
  confirmDetails: { color: "#64748b", fontSize: 14, lineHeight: 2, marginBottom: 24 },

  // FEATURES
  features: { background: "#fff", padding: "60px 24px", marginTop: 40 },
  featuresTitle: { textAlign: "center", fontSize: 28, fontWeight: 800, color: "#1e293b", marginBottom: 40 },
  featuresGrid: { maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 },
  featureCard: { textAlign: "center", padding: 24 },
  featureIcon: { fontSize: 40, marginBottom: 12 },
  featureTitle: { fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 8 },
  featureDesc: { fontSize: 14, color: "#64748b", lineHeight: 1.5 },

  // FOOTER
  footer: { background: "#1e293b", color: "#94a3b8", padding: "40px 24px", marginTop: 40 },
  footerInner: { maxWidth: 1200, margin: "0 auto", textAlign: "center" },
  footerLogo: { fontSize: 26, fontWeight: 800, marginBottom: 12 },
  footerNote: { fontSize: 13, margin: "4px 0" },
};
