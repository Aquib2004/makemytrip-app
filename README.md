# MakeMyTrip Clone

A React single-page travel booking interface that integrates the
[TravClan](https://travclan.com) sandbox API for authentication, flight search,
and hotel search.

> **Status: prototype.** This targets the TravClan **sandbox** environment only.
> There is no production deployment, and the credentials it needs are not
> included in this repository.

---

## What it does

- Authenticates against the TravClan sandbox auth service
- Searches flights (`one-way` and `round-trip`)
- Searches hotels
- Rises results with React state and inline styles

The integration is real: `App.jsx` calls the sandbox endpoints directly for
login, flight search, and hotel search.

---

## Tech

| | |
| --- | --- |
| Framework | React 18, Create React App |
| Language | JavaScript |
| API | TravClan sandbox (REST) |
| Dependencies | `react`, `react-dom`, `react-scripts` only |

---

## Running it

```bash
npm install
npm start        # development server on http://localhost:3000
npm run build    # production bundle
```

### Credentials

The app expects TravClan sandbox credentials, supplied at runtime. Do not commit
them. The sandbox endpoints are configured in `App.jsx` under `SANDBOX`:

```js
const SANDBOX = {
  auth: "https://trav-auth-sandbox.travclan.com/authentication/internal/service/login",
  flights: "https://api-sandbox.travclan.com",
  hotels: "https://hms-external-sandbox.travclan.com",
};
```

You will need your own TravClan sandbox account to authenticate; without valid
credentials the search endpoints cannot return live data.

---

## Known limitations

- Sandbox API only — no production TravClan integration.
- No tests and no CI. This is prototype-quality code kept as a reference.
- UI is a single `App.jsx` with inline styles, so it is not a reusable
  component structure.
- No deployed demo.

---

## License

MIT — see [LICENSE](LICENSE).