
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback
} from "react";

import {
  getHealth,
  getRecommendations,
  confirmReschedule,
  getHistory,
  predictFlightDelay,
  matchFlightsWithAI,
  confirmDemoPayment,
  submitDemoRefund
} from "./api.js";

import SplashScreen from "./SplashScreen.jsx";
import WelcomePage from "./WelcomePage.jsx";
import AuthPage from "./AuthPage.jsx";

const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(n || 0));

/* Main application flow */
export default function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("flyflex_user") || "null"
      );
    } catch {
      return null;
    }
  });

  const [screen, setScreen] = useState(() => {
    const token = localStorage.getItem("flyflex_token");
    const savedUser = localStorage.getItem("flyflex_user");

    return token && savedUser ? "dashboard" : "splash";
  });

  const [selectedRole, setSelectedRole] = useState("USER");

  const finishSplash = useCallback(() => {
    setScreen("welcome");
  }, []);

  function chooseRole(role) {
    setSelectedRole(role);
    setScreen("auth");
  }

  function handleAuthenticated(account) {
    localStorage.setItem("flyflex_token", account.token);
    localStorage.setItem(
      "flyflex_user",
      JSON.stringify(account)
    );

    setUser(account);
    setScreen("dashboard");
  }

  function logout() {
    localStorage.removeItem("flyflex_token");
    localStorage.removeItem("flyflex_user");

    setUser(null);
    setSelectedRole("USER");
    setScreen("welcome");
  }

  if (screen === "splash") {
    return <SplashScreen onComplete={finishSplash} />;
  }

  if (screen === "welcome") {
    return <WelcomePage onChooseRole={chooseRole} />;
  }

  if (screen === "auth") {
    return (
      <AuthPage
        role={selectedRole}
        onAuthenticated={handleAuthenticated}
        onBack={() => setScreen("welcome")}
      />
    );
  }

  if (
    screen === "dashboard" &&
    user &&
    localStorage.getItem("flyflex_token")
  ) {
    return (
      <Dashboard
        user={user}
        onLogout={logout}
      />
    );
  }

  return <WelcomePage onChooseRole={chooseRole} />;
}

/* Admin dashboard overview */
function AdminOverview() {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    import("./api.js")
      .then(({ default: api }) =>
        Promise.all([
          api.get("/admin/users"),
          api.get("/admin/rescheduling")
        ])
      )
      .then(([usersResponse, requestsResponse]) => {
        setUsers(usersResponse.data);
        setRequests(requestsResponse.data);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
          "Unable to load admin data."
        );
      });
  }, []);

  return (
    <section className="panel history-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">ADMIN ONLY</span>
          <h2>Administration overview</h2>
          <p>
            Registered accounts and all rescheduling requests.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert error">{error}</div>
      )}

      <h3>Registered users ({users.length})</h3>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.createdAt?.slice(0, 10) || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>
        All rescheduling requests ({requests.length})
      </h3>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Booking</th>
              <th>Route</th>
              <th>New flight</th>
              <th>Additional payment</th>
              <th>Payment status</th>
              <th>Refund status</th>
              <th>Refund amount</th>
              <th>Request status</th>
            </tr>
          </thead>

          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.user?.email || "—"}</td>
                <td>{r.originalBookingReference}</td>
                <td>
                  {r.originCode} → {r.destinationCode}
                </td>
                <td>
                  {r.selectedFlight?.flightNumber || "—"}
                </td>
                <td>{money(r.additionalPayment)}</td>
                <td>{r.paymentStatus || "NOT_REQUIRED"}</td>
                <td>{r.refundStatus || "NOT_APPLICABLE"}</td>
                <td>{money(r.refundAmount)}</td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* User dashboard with AI and demo payment/refund integration */
function Dashboard({ user, onLogout }) {
  const [health, setHealth] = useState("checking");

  const [origin, setOrigin] = useState("BLR");
  const [destination, setDestination] = useState("DEL");

  const [examDate, setExamDate] = useState("2026-11-01");
  const [bufferDays, setBufferDays] = useState(1);

  const [credit, setCredit] = useState(6000);

  const [fromDate, setFromDate] = useState("2026-11-02");
  const [toDate, setToDate] = useState("2026-11-04");

  const [bookingReference, setBookingReference] =
    useState("DEMO-2026-001");

  const [originalDate, setOriginalDate] =
    useState("2026-10-29");

  const [options, setOptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);

  // AI states
  const [preferences, setPreferences] = useState(
    "I prefer a cheaper morning flight"
  );

  const [aiMatches, setAiMatches] = useState({});
  const [delayEstimates, setDelayEstimates] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiWarning, setAiWarning] = useState("");

  // Demo payment and refund states
  const [pendingRequest, setPendingRequest] = useState(null);
  const [demoUpiId, setDemoUpiId] = useState("");

  const [refundDetails, setRefundDetails] = useState({
    holderName: "",
    bankName: "",
    accountNumber: "",
    ifsc: ""
  });

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getHealth()
      .then(() => setHealth("connected"))
      .catch(() => setHealth("offline"));

    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const res = await getHistory();
      setHistory(res.data);
    } catch {
      // History may be unavailable if backend is offline.
    }
  }

  /* Fetch eligible flights and run both AI models */
  async function recommend(e) {
    e.preventDefault();

    setBusy(true);
    setAiLoading(true);
    setError("");
    setNotice("");
    setAiWarning("");

    setOptions([]);
    setSelected(null);
    setAiMatches({});
    setDelayEstimates({});

    try {
      // Step 1: Get eligible flights from Spring Boot.
      const res = await getRecommendations({
        origin,
        destination,
        examCompletionDate: examDate,
        bufferDays: Number(bufferDays),
        eligibleTicketCredit: Number(credit),
        fromDate,
        toDate
      });

      const flights = res.data;
      setOptions(flights);

      if (!flights.length) {
        setNotice(
          "No eligible sample flights found. Try a different date range or check database seed data."
        );
        return;
      }

      // Step 2: Convert Java flight fields into FastAPI format.
      const aiFlightCandidates = flights.map((option) => {
        const flight = option.flight;

        return {
          id: flight.id,
          airline: flight.airline,
          flight_number: flight.flightNumber,
          origin: flight.originCode,
          destination: flight.destinationCode,
          departure_at: flight.departureAt,
          fare: Number(flight.fare),
          change_fee: Number(flight.changeFee || 0),
          flexibility_score: Number(
            flight.flexibilityScore ?? 1
          )
        };
      });

      // Step 3: Sentence-BERT preference matching.
      const matchingPromise = matchFlightsWithAI({
        preferences,
        flights: aiFlightCandidates
      })
        .then((response) => {
          const matches = {};

          (response.data.matches || []).forEach((match) => {
            matches[match.flight_id] = match.similarity;
          });

          setAiMatches(matches);
        })
        .catch((err) => {
          console.error("Sentence-BERT error:", err);

          setAiWarning(
            "AI preference matching is temporarily unavailable. Existing recommendations are still available."
          );
        });

      // Step 4: XGBoost delay prediction.
      const predictionTasks = flights.map(async (option) => {
        const flight = option.flight;

        const departure = new Date(flight.departureAt);

        const payload = {
          route: `${flight.originCode}-${flight.destinationCode}`,
          departure_hour: departure.getHours(),
          day_of_week: departure.getDay(),
          month: departure.getMonth() + 1,
          demand_level: 2,
          weather_risk: 1
        };

        try {
          const response = await predictFlightDelay(payload);

          return {
            flightId: flight.id,
            prediction: response.data.predicted_delay_minutes
          };
        } catch (err) {
          console.error(
            `Delay prediction failed for flight ${flight.id}:`,
            err
          );

          return {
            flightId: flight.id,
            prediction: null
          };
        }
      });

      const predictionResults = await Promise.all(
        predictionTasks
      );

      const estimates = {};

      predictionResults.forEach((result) => {
        estimates[result.flightId] = result.prediction;
      });

      setDelayEstimates(estimates);

      await matchingPromise;

      setNotice(
        "Eligible flights loaded. AI analysis is complete where available."
      );

    } catch (err) {
      console.error("Recommendation error:", err);

      setError(
        err.response?.data?.error ||
        "Could not connect to backend. Start Spring Boot and check MySQL configuration."
      );
    } finally {
      setBusy(false);
      setAiLoading(false);
    }
  }

  /* Create a rescheduling request */
  async function confirm() {
    if (!selected) return;

    setBusy(true);
    setError("");
    setNotice("");
    setPendingRequest(null);

    try {
      const res = await confirmReschedule({
        bookingReference,
        origin,
        destination,
        originalDepartureDate: originalDate,
        examCompletionDate: examDate,
        bufferDays: Number(bufferDays),
        selectedFlightId: selected.flight.id,
        eligibleTicketCredit: Number(credit)
      });

      const request = res.data;

      setPendingRequest(request);

      if (Number(request.additionalPayment) > 0) {
        setNotice(
          `Request #${request.id} created. Complete the demo payment below.`
        );
      } else if (Number(request.refundAmount) > 0) {
        setNotice(
          `Request #${request.id} created. Enter demo refund details below.`
        );
      } else {
        setNotice(
          `Request #${request.id} created successfully. No additional payment or refund is required.`
        );
      }

      await loadHistory();

    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Unable to create simulated request."
      );
    } finally {
      setBusy(false);
    }
  }

  /* Confirm simulated UPI payment */
  async function handleDemoPayment(e) {
    e.preventDefault();

    if (!pendingRequest || !demoUpiId.trim()) {
      setError("Enter a fictional demo UPI ID.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await confirmDemoPayment(pendingRequest.id);

      setNotice(
        "Demo payment confirmed successfully. No real money was transferred."
      );

      setPendingRequest(null);
      setDemoUpiId("");

      await loadHistory();

    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Demo payment confirmation failed."
      );
    } finally {
      setBusy(false);
    }
  }

  /* Submit simulated refund request */
  async function handleDemoRefund(e) {
    e.preventDefault();

    if (
      !pendingRequest ||
      !refundDetails.holderName.trim() ||
      !refundDetails.bankName.trim() ||
      !refundDetails.accountNumber.trim() ||
      !refundDetails.ifsc.trim()
    ) {
      setError("Please complete all demo bank details.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await submitDemoRefund(pendingRequest.id);

      setNotice(
        "Demo refund request submitted. No real bank transfer was made."
      );

      setPendingRequest(null);

      setRefundDetails({
        holderName: "",
        bankName: "",
        accountNumber: "",
        ifsc: ""
      });

      await loadHistory();

    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Demo refund request failed."
      );
    } finally {
      setBusy(false);
    }
  }

  const eligibleDate = useMemo(() => {
    if (!examDate) return "—";

    const d = new Date(`${examDate}T12:00:00`);

    d.setDate(
      d.getDate() + Number(bufferDays || 0)
    );

    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }, [examDate, bufferDays]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">FF</div>

          <div>
            <b>FlyFlex-AI</b>
            <span>STUDENT PRICE PROTECTION</span>
          </div>
        </div>

        <div className="side-label">WORKSPACE</div>

        <a className="nav active" href="#dashboard">
          ▦ <span>Dashboard</span>
        </a>

        <a className="nav" href="#account">
          ◉ <span>My account</span>
        </a>

        <a className="nav" href="#planner">
          ✈ <span>Reschedule planner</span>
        </a>

        <a className="nav" href="#history">
          ◷ <span>Request history</span>
        </a>

        <div className="sidebar-bottom">
          <div className="help-icon">
            {(user.fullName || user.email || "U")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <b>{user.fullName || "FlyFlex User"}</b>
            <p>
              {user.role === "ADMIN"
                ? "Administrator"
                : "Registered user"}
            </p>
          </div>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              STUDENT TRAVEL ASSISTANT
            </span>

            <h1>Flight rescheduling dashboard</h1>

            <small>
              Signed in as {user.fullName} ({user.role})
            </small>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center"
            }}
          >
            <div className={`connection ${health}`}>
              <i />
              {health === "connected"
                ? "Backend connected"
                : health === "checking"
                  ? "Checking backend"
                  : "Backend offline"}
            </div>

            <button
              className="outline-button compact"
              onClick={onLogout}
            >
              Log out
            </button>
          </div>
        </header>

        {/* Account details */}
        <section className="panel" id="account">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">MY ACCOUNT</span>
              <h2>Account details</h2>
              <p>Your currently signed-in account.</p>
            </div>
          </div>

          <div className="flight-details">
            <div>
              <span>Full name</span>
              <b>{user.fullName || "—"}</b>
            </div>

            <div>
              <span>Email address</span>
              <b>{user.email || "—"}</b>
            </div>

            <div>
              <span>Account role</span>
              <b>{user.role || "USER"}</b>
            </div>
          </div>
        </section>

        <section className="welcome">
          <div>
            <span className="pill">
              SMART RESCHEDULING
            </span>

            <h2>
              Your exam changed.
              <br />
              <em>Your travel plan can adapt.</em>
            </h2>

            <p>
              Find eligible alternatives, compare your
              additional cost, and protect the value of
              your existing booking.
            </p>
          </div>

          <div className="plane-art" aria-hidden="true">
            ✈
          </div>
        </section>

        <section className="stat-grid">
          <div className="stat-card">
            <span>Original ticket credit</span>
            <strong>{money(credit)}</strong>
            <small>Illustrative eligible value</small>
          </div>

          <div className="stat-card">
            <span>Earliest eligible departure</span>
            <strong>{eligibleDate}</strong>
            <small>Exam completion + buffer</small>
          </div>

          <div className="stat-card">
            <span>Alternatives found</span>
            <strong>{options.length}</strong>
            <small>After date and route filters</small>
          </div>
        </section>

        {/* Trip and exam planner */}
        <section className="panel" id="planner">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">STEP 01</span>
              <h2>Trip & exam details</h2>
              <p>
                Update the booking context to discover
                suitable alternatives.
              </p>
            </div>

            <span className="step-tag">
              CONFLICT CHECK
            </span>
          </div>

          <form onSubmit={recommend} className="form-grid">
            <label>
              Origin airport code
              <input
                value={origin}
                onChange={(e) =>
                  setOrigin(e.target.value.toUpperCase())
                }
                maxLength="3"
                required
              />
            </label>

            <label>
              Destination airport code
              <input
                value={destination}
                onChange={(e) =>
                  setDestination(e.target.value.toUpperCase())
                }
                maxLength="3"
                required
              />
            </label>

            <label>
              Booking reference
              <input
                value={bookingReference}
                onChange={(e) =>
                  setBookingReference(e.target.value)
                }
                required
              />
            </label>

            <label>
              Original flight date
              <input
                type="date"
                value={originalDate}
                onChange={(e) =>
                  setOriginalDate(e.target.value)
                }
                required
              />
            </label>

            <label>
              Revised exam completion
              <input
                type="date"
                value={examDate}
                onChange={(e) =>
                  setExamDate(e.target.value)
                }
                required
              />
            </label>

            <label>
              Buffer days after exam
              <input
                type="number"
                min="0"
                max="14"
                value={bufferDays}
                onChange={(e) =>
                  setBufferDays(e.target.value)
                }
                required
              />
            </label>

            <label>
              Eligible ticket credit (₹)
              <input
                type="number"
                min="0"
                value={credit}
                onChange={(e) =>
                  setCredit(e.target.value)
                }
                required
              />
            </label>

            <label>
              Search from
              <input
                type="date"
                value={fromDate}
                onChange={(e) =>
                  setFromDate(e.target.value)
                }
                required
              />
            </label>

            <label>
              Search until
              <input
                type="date"
                value={toDate}
                onChange={(e) =>
                  setToDate(e.target.value)
                }
                required
              />
            </label>

            <label className="full-width">
              Describe your flight preferences
              <textarea
                value={preferences}
                onChange={(e) =>
                  setPreferences(e.target.value)
                }
                placeholder="Example: I prefer a cheaper morning flight from Bangalore to Delhi."
                rows="3"
                minLength="3"
                maxLength="1000"
                required
              />
              <small>
                Sentence-BERT compares your description
                with eligible flights.
              </small>
            </label>

            <div className="form-footer">
              <p>
                Flights before <b>{eligibleDate}</b> will
                be excluded.
              </p>

              <button
                className="primary"
                disabled={busy || aiLoading}
              >
                {busy
                  ? "Analyzing flights…"
                  : "Find best alternatives"}
                <span>→</span>
              </button>
            </div>
          </form>
        </section>

        {error && (
          <div className="alert error">{error}</div>
        )}

        {notice && (
          <div className="alert success">{notice}</div>
        )}

        {/* AI model information */}
        <section className="panel ai-information">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">AI ENGINE</span>
              <h2>Intelligent flight analysis</h2>
              <p>
                Two AI models provide additional information
                about eligible flights.
              </p>
            </div>
          </div>

          <div className="ai-model-grid">
            <div className="ai-model-card">
              <h3>Sentence-BERT</h3>
              <p>
                Compares your written preferences with
                available flight descriptions and produces
                a semantic similarity score.
              </p>
              <span>Preference matching</span>
            </div>

            <div className="ai-model-card">
              <h3>XGBoost</h3>
              <p>
                Estimates flight delay minutes using
                route, departure time, demand and weather
                input values.
              </p>
              <span>Delay estimation</span>
            </div>
          </div>

          <p className="ai-disclaimer">
            Delay predictions use synthetic demonstration
            training data. Demand and weather inputs are
            illustrative assumptions, not live airline data.
            AI scores do not validate flight safety,
            availability or booking eligibility.
          </p>

          {aiWarning && (
            <div className="alert error">
              {aiWarning}
            </div>
          )}
        </section>

        {/* Flight recommendations */}
        <section className="results-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">STEP 02</span>
              <h2>AI-assisted recommendations</h2>
              <p>
                Existing backend ranking uses additional
                payment and change flexibility. AI scores
                are displayed separately.
              </p>
            </div>

            {options.length > 0 && (
              <span className="result-count">
                {options.length} options
              </span>
            )}
          </div>

          {options.length === 0 ? (
            <div className="empty-state">
              <div className="empty-plane">✈</div>
              <h3>Your flight options will appear here</h3>
              <p>
                Enter your updated exam date and search to
                compare sample flights.
              </p>
            </div>
          ) : (
            <div className="flight-list">
              {options.map((o, index) => (
                <article
                  key={o.flight.id}
                  className={`flight-card ${
                    selected?.flight.id === o.flight.id
                      ? "chosen"
                      : ""
                  }`}
                >
                  <div className="flight-card-top">
                    <div>
                      <span
                        className={
                          index === 0 ? "rank best" : "rank"
                        }
                      >
                        {index === 0
                          ? "TOP MATCH"
                          : `OPTION 0${index + 1}`}
                      </span>

                      <h3>{o.flight.airline}</h3>

                      <span className="flight-number">
                        {o.flight.flightNumber}
                      </span>
                    </div>

                    <div className="flight-price">
                      <strong>{money(o.flight.fare)}</strong>
                      <span>sample fare</span>
                    </div>
                  </div>

                  <div className="route-row">
                    <div>
                      <b>
                        {o.flight.departureAt?.slice(11, 16)}
                      </b>
                      <span>{o.flight.originCode}</span>
                    </div>

                    <div className="route-line">
                      <small>
                        {o.flight.durationMinutes} min
                      </small>
                      <i />
                      <span>Direct demo route</span>
                    </div>

                    <div>
                      <b>
                        {o.flight.arrivalAt?.slice(11, 16)}
                      </b>
                      <span>{o.flight.destinationCode}</span>
                    </div>
                  </div>

                  <div className="flight-details">
                    <div>
                      <span>Departure</span>
                      <b>
                        {o.flight.departureAt?.slice(0, 10)}
                      </b>
                    </div>

                    <div>
                      <span>Change fee</span>
                      <b>{money(o.flight.changeFee)}</b>
                    </div>

                    <div>
                      <span>Additional payment</span>
                      <b className="amount">
                        {money(o.additionalPayment)}
                      </b>
                    </div>

                    <div>
                      <span>Backend score</span>
                      <b>
                        {(o.score * 100).toFixed(0)}/100
                      </b>
                    </div>
                  </div>

                  <p className="reason">{o.reason}</p>

                  <div className="ai-results">
                    <div>
                      <span>
                        Sentence-BERT similarity
                      </span>

                      <b>
                        {aiMatches[o.flight.id] !== undefined
                          ? `${(
                              aiMatches[o.flight.id] * 100
                            ).toFixed(2)}%`
                          : aiLoading
                            ? "Analyzing…"
                            : "Unavailable"}
                      </b>
                    </div>

                    <div>
                      <span>
                        XGBoost estimated delay
                      </span>

                      <b>
                        {delayEstimates[o.flight.id] !== undefined &&
                        delayEstimates[o.flight.id] !== null
                          ? `${Number(
                              delayEstimates[o.flight.id]
                            ).toFixed(1)} minutes`
                          : aiLoading
                            ? "Predicting…"
                            : "Unavailable"}
                      </b>
                    </div>
                  </div>

                  <button
                    className={
                      selected?.flight.id === o.flight.id
                        ? "selected-button"
                        : "outline-button"
                    }
                    onClick={() => setSelected(o)}
                    disabled={busy}
                  >
                    {selected?.flight.id === o.flight.id
                      ? "Selected ✓"
                      : "Choose this flight"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Rescheduling confirmation */}
        {selected && (
          <section className="confirm-panel">
            <div>
              <span className="eyebrow">STEP 03</span>
              <h2>Confirm demo request</h2>

              <p>
                {selected.flight.airline}{" "}
                {selected.flight.flightNumber} on{" "}
                {selected.flight.departureAt.slice(0, 10)}.
                Estimated additional payment:{" "}
                <b>
                  {money(selected.additionalPayment)}
                </b>.
              </p>

              <small>
                This creates an internal demo request only.
                It does not rebook a real airline ticket.
              </small>
            </div>

            <button
              className="primary"
              disabled={busy || pendingRequest !== null}
              onClick={confirm}
            >
              {busy
                ? "Submitting…"
                : pendingRequest
                  ? "Request created"
                  : "Confirm simulated reschedule →"}
            </button>
          </section>
        )}

        {/* Demo UPI payment screen */}
        {pendingRequest &&
          Number(pendingRequest.additionalPayment) > 0 && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">DEMO PAYMENT</span>
                  <h2>Complete simulated UPI payment</h2>
                  <p>
                    Request #{pendingRequest.id}
                  </p>
                </div>
              </div>

              <h3>
                Amount to pay:{" "}
                {money(pendingRequest.additionalPayment)}
              </h3>

              <form
                onSubmit={handleDemoPayment}
                className="form-grid"
              >
                <label className="full-width">
                  Demo UPI ID
                  <input
                    type="text"
                    value={demoUpiId}
                    onChange={(e) =>
                      setDemoUpiId(e.target.value)
                    }
                    placeholder="example@demo"
                    required
                  />
                </label>

                <p className="full-width muted">
                  Use a fictional demo ID only. This is not
                  a real UPI transaction. Do not enter your
                  actual UPI ID.
                </p>

                <div className="form-footer">
                  <button
                    type="submit"
                    className="primary"
                    disabled={busy}
                  >
                    {busy
                      ? "Confirming…"
                      : "Confirm demo payment"}
                  </button>
                </div>
              </form>
            </section>
          )}

        {/* Demo refund screen */}
        {pendingRequest &&
          Number(pendingRequest.refundAmount) > 0 && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">DEMO REFUND</span>
                  <h2>Refund account details</h2>
                  <p>
                    Request #{pendingRequest.id}
                  </p>
                </div>
              </div>

              <h3>
                Eligible refund:{" "}
                {money(pendingRequest.refundAmount)}
              </h3>

              <form
                onSubmit={handleDemoRefund}
                className="form-grid"
              >
                <label>
                  Account holder name
                  <input
                    value={refundDetails.holderName}
                    onChange={(e) =>
                      setRefundDetails({
                        ...refundDetails,
                        holderName: e.target.value
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Bank name
                  <input
                    value={refundDetails.bankName}
                    onChange={(e) =>
                      setRefundDetails({
                        ...refundDetails,
                        bankName: e.target.value
                      })
                    }
                    required
                  />
                </label>

                <label>
                  Account number (demo)
                  <input
                    value={refundDetails.accountNumber}
                    onChange={(e) =>
                      setRefundDetails({
                        ...refundDetails,
                        accountNumber: e.target.value
                      })
                    }
                    required
                  />
                </label>

                <label>
                  IFSC code (demo)
                  <input
                    value={refundDetails.ifsc}
                    onChange={(e) =>
                      setRefundDetails({
                        ...refundDetails,
                        ifsc: e.target.value.toUpperCase()
                      })
                    }
                    required
                  />
                </label>

                <p className="full-width muted">
                  Use fictional details only. These details
                  are not sent to or stored by the backend.
                  No real refund is made.
                </p>

                <div className="form-footer">
                  <button
                    type="submit"
                    className="primary"
                    disabled={busy}
                  >
                    {busy
                      ? "Submitting…"
                      : "Submit demo refund request"}
                  </button>
                </div>
              </form>
            </section>
          )}

        {/* Request history */}
        <section
          className="panel history-panel"
          id="history"
        >
          <div className="panel-heading">
            <div>
              <span className="eyebrow">ACTIVITY</span>
              <h2>Rescheduling request history</h2>
              <p>
                Saved requests from this demo database.
              </p>
            </div>

            <button
              className="outline-button compact"
              onClick={loadHistory}
              disabled={busy}
            >
              Refresh
            </button>
          </div>

          {history.length === 0 ? (
            <p className="muted">
              No requests saved yet.
            </p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Route</th>
                    <th>New departure</th>
                    <th>Additional payment</th>
                    <th>Payment status</th>
                    <th>Refund status</th>
                    <th>Refund amount</th>
                    <th>Request status</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td>{h.originalBookingReference}</td>

                      <td>
                        {h.originCode} → {h.destinationCode}
                      </td>

                      <td>
                        {h.selectedFlight?.departureAt?.slice(
                          0,
                          10
                        ) || "—"}
                      </td>

                      <td>{money(h.additionalPayment)}</td>

                      <td>
                        {h.paymentStatus || "NOT_REQUIRED"}
                      </td>

                      <td>
                        {h.refundStatus || "NOT_APPLICABLE"}
                      </td>

                      <td>{money(h.refundAmount)}</td>

                      <td>
                        <span className="status">
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Admin section */}
        {user.role === "ADMIN" && <AdminOverview />}

        <footer>
          FlyFlex-AI · AI project prototype
          <span>
            Simulated data · No real ticket transactions
          </span>
        </footer>
      </main>
    </div>
  );
}
