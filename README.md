# Chuka Premier League — Site

## Recent updates (this build)

- **Mobile nav** — a hamburger menu now collapses the 15-link nav into a
  slide-in panel below ~780px wide (`layout.js` + `styles.css`).
  Tables also scroll horizontally instead of squashing on small screens.
- **One login for everyone** — `login.html`/`auth.js` now works for
  players, team contacts, referees, and CPL officials, all landing on
  a new generic **`my-profile.html`** hub after sign-in.
- **Pending profiles are hidden, except from their owner** — a
  not-yet-approved player is no longer visible on `players.html`,
  `team.html`'s squad view, or their own `player.html` page to the
  public, but they can still see it themselves once signed in (with a
  "still pending" banner).
- **Referees & Officials get photos** — `referees.html`/`officials.html`
  moved from plain tables to a card grid (photo, or initials fallback,
  matching the players directory) and no longer show raw phone/email
  `Contact` info publicly — that's admin-only now.
- **Referee/Official registration** — both forms gained a password field
  (for the new shared login) and an optional photo upload.
- **Team registration** — gained a password field so a team contact can
  sign in too.
- Payment phone number now displays in local format (`0740953324`)
  instead of `254740953324`.
- See **`BACKEND-TODO.md`** — several of the above need small
  `code.gs` additions before they're fully live (this zip is
  frontend-only). The site degrades gracefully until then.

A static site (no build step) for the Chuka Premier League, backed entirely
by a Google Sheet (data) and a Google Apps Script web app (writes/uploads).
Pair this with the `chuka-premier-league-apps-script` project.

## How it works

- **Reads** (standings, fixtures, teams, players, news, gallery, equipment,
  referees, officials) come straight from the Sheet's published CSV export —
  fast, free, no auth. See `data.js` → `CPL.get()`.
- **Writes** (registrations, enquiries, login, profile edits, image
  uploads) go through the Apps Script `/exec` endpoint as a POST. See
  `data.js` → `CPL.post()`.
- Every registration lands as a `Pending` row — an admin reviews and
  activates it directly in the Sheet (or from the admin dashboard's
  Approvals tab). Nothing self-approves except CPL number assignment,
  which is a semi-automatic trigger (admin sets `Status = Paid`, the
  script does the rest).
- M-Pesa payments go to the number in `Config`'s `PAYMENT_PHONE` row
  (default `254740953324`), shown on `register-player.html` and
  `register-team.html`. Change it any time from the admin dashboard's
  "Season & Links" tab — no redeploy needed.

## One-time setup

1. **Create the Google Sheet** that will hold all data (or use an
   existing one) and copy its ID from the URL — the long string between
   `/d/` and `/edit`.
2. **Set up the Apps Script backend** — see the `apps-script` project's
   comments. Run `runFullSetup()` once, then
   **Deploy → New deployment → Web app** (Execute as: Me, Who has
   access: Anyone). Copy the resulting `/exec` URL.
3. **Configure this site** — open `data.js` and set:
   ```js
   SHEET_ID: 'your-sheet-id-here',
   APPS_SCRIPT_URL: 'https://script.google.com/macros/s/.../exec',
   ```
4. **Publish the Sheet to the web** (File → Share → Publish to web), or
   at minimum share it as "Anyone with the link — Viewer", so the CSV
   read endpoints work. To test this in isolation, open this URL in a
   browser (swap in your own `SHEET_ID` and a real tab name):
   ```
   https://docs.google.com/spreadsheets/d/SHEET_ID/gviz/tq?tqx=out:csv&sheet=Teams_A
   ```
   You should see raw CSV text. A Google sign-in page means the Sheet
   isn't shared for link access; an error/`#N/A` page means the
   `SHEET_ID` or tab name is wrong.
5. Host the `site/` folder anywhere that serves static files (GitHub
   Pages, Netlify, Cloudflare Pages, a plain web server — no build step
   needed).

## Registration → team list

The player registration form's Team dropdown reads from
**`Team_Registrations`** (not `Teams_A`/`Teams_B`), filtered to rows
whose `Status` isn't `Pending` — so a team only becomes selectable once
an admin has approved it there. `Teams_A`/`Teams_B` remain the
richer, publicly-displayed team pages (colors, ground, coach, logo) and
are populated separately once a team is fully set up.

**Heads up on privacy:** `Team_Registrations` also holds `Contact Email`,
`Contact Phone`, and `Payment Ref`. Because the whole Sheet has to be
link-shared for any public read to work, and the registration page now
fetches this tab by name on every load, treat that data as exposed to
anyone who has the Sheet link — not just internally. If that's a
problem, move those columns to a separate tab the frontend never reads.

## Uploads (player photos, team logos)

Three flows upload an image to Google Drive via the Apps Script backend:

- **Player photo**, optionally right at registration on
  `register-player.html` — a failed photo upload never blocks the
  registration itself; the player can just add one later.
- **Team logo**, optionally at registration on `register-team.html`.
- **Player photo**, again later on `player.html` (via the bio/photo edit
  panel a signed-in player sees on their own profile) — this can replace
  the one set at registration.

All three go through `cplCompressImage()` in `data.js` before upload:
the image is downscaled to fit within ~800px and re-encoded as a JPEG
in the browser using a `<canvas>`, *before* it's base64-encoded and
POSTed. This matters because:

- Raw phone-camera photos are routinely 5–12MB. Base64 inflates that by
  ~33%. Posting a 15MB+ text body to an Apps Script web app is the most
  common reason an upload silently hangs, times out, or fails on a slow
  connection — compressing first keeps every upload well under ~1MB.
- The backend (`saveDataUrlToDrive_` in `code.gs`) detects the real image
  type from the data URL instead of assuming JPEG, and rejects
  oversized payloads with a clear error instead of failing silently.

**Every uploaded file (player photos, team logos, admin-uploaded
documents/media) is shared as "Anyone with the link — Viewer"** — free
to view online by anyone, no Google sign-in, and never editable by the
public. The URL returned to the site is also picked so it *displays*
rather than downloads or shows a Google Drive interstitial:
- Images use an `lh3.googleusercontent.com` content-delivery link
  (what Google itself uses to render Drive images inline elsewhere) —
  it drops straight into an `<img>` tag with no download prompt.
- Everything else (PDFs, docs, video) uses Drive's `/preview` viewer,
  which opens/renders right in the browser instead of downloading.

See `driveViewUrl_()` in `code.gs` for the exact logic.

**If an upload still doesn't work**, check, in order:
1. Did you run `runFullSetup()` in the Apps Script project? It creates
   the `CPL-Player-Photos` / `CPL-Team-Logos` Drive folders and stores
   their IDs in Script Properties — uploads fail with "Drive folder not
   configured" without this.
2. Did you **redeploy** the web app after any script change? Apps Script
   web app URLs are pinned to a specific deployment version — editing
   `code.gs` does nothing to the live `/exec` URL until you deploy a new
   version (or update the existing deployment).
3. Is `APPS_SCRIPT_URL` in `data.js` the exact `/exec` URL from that
   deployment?
4. Open the browser console on submit — `CPL.post()` failures (network
   errors, non-JSON responses) show up there, and the Apps Script
   project's **Executions** log (in the Apps Script editor) shows any
   server-side error with a stack trace.

## Admin dashboard

`admin.html` (+ `admin.js`) is a control panel for the league admin —
sign in with an email/password stored (salted + hashed) in a new
`Admin_Users` tab. It is **not linked from the public nav** in
`layout.js`; only someone with the URL sees the login form. See
`../apps-script/SETUP-ADMIN.md` for one-time setup (creating tabs,
seeding the first admin login, deploying the script).

From the dashboard, an admin can:

- **Approve or reject** pending player / team / referee / **CPL official**
  registrations (approving a player sets `Status = Paid`, which
  auto-assigns their CPL number — same mechanism the original manual
  Sheet edit used). **Approving a team also auto-adds it to its
  league's Standings table** (all-zero stats) — see "Manage Standings"
  below.
- **Manage Standings** — edit each team's Played/W/D/L/GF/GA/Points, etc.
  A team approved via Approvals is added here automatically; a
  **"Sync Teams from Registrations"** button catches up anything
  approved before that existed.
- **Add fixtures and enter results** — pick **League A or League B**
  before adding a fixture (that's what decides whether it's written to
  `Fixtures_A` or `Fixtures_B`), and adding a fixture and saving a
  score writes the matching `Fixtures_A/B` + `Results_A/B` rows for
  you. Each fixture can also be **tagged with a referee** from a
  dropdown of approved referees.
- **Manage Player Stats / scoring** — goals, assists, clean sheets,
  yellow/red cards per player, which feeds Top Scorers / Top Clean
  Sheets on the League A/B pages
- **Manage the Gallery and Equipment** lists, with image upload
- **Share documents** — uploads a file to Drive, which then shows as a
  download card on the homepage (`Documents` tab)
- **Control the season & registration links** — set the season label,
  the M-Pesa payment number, flip player/team/referee/official
  registration open or closed (`Config` tab), and copy ready-to-share
  links to all four registration pages
- **Post transfer announcements** — shown on the `transfers.html`
  page and teased on the homepage (`Transfers` tab)
- **Review team-initiated transfer requests** — a signed-in team can
  request to sign a player from another team, from their
  **My Profile** page. That player's *current* team has to approve the
  release first (also from My Profile), which auto-generates a
  transfer document; only then does it land in the **Transfer
  Requests** tab for your final approve/reject — approving moves the
  player and posts a `Transfers` announcement automatically.
- **Moderate team galleries** — any signed-in team can upload photos to
  their own team's public gallery from My Profile; the **Team
  Galleries** tab lets you remove anything inappropriate.
- **Post/remove news** items (same `News` tab `news.html` already reads)
- **Change their own admin password**

The richer `Teams_A`/`Teams_B` team profiles (ground, coach, bio) are
still edited directly in the Sheet — the dashboard doesn't cover those.

## File map

| File | Purpose |
|---|---|
| `data.js` | Config, CSV reader (with clear fetch-failure errors), `CPL.get`/`CPL.post`, `cplCompressImage`, shared helpers |
| `layout.js` | Shared header/nav/footer, incl. the mobile hamburger toggle |
| `auth.js` | Shared login (email + password) for players, teams, referees, and officials; session in `sessionStorage` |
| `my-profile.html` / `my-profile.js` | Generic post-login profile hub — renders the right card/status for whichever account type signed in; a signed-in **team** contact can also request to sign a player from another team here and see the status of requests they've sent |
| `registrations.js` | Player / team / referee / CPL official registration forms, incl. optional photo/logo upload, password fields, and M-Pesa payment-number display |
| `profile-edit.js` | Signed-in player's bio + photo edit panel |
| `standings.js`, `fixtures.js`, `teams.js` | League A/B tables (with team crests + compact homepage "See All" preview), fixtures, team pages (squad view hides pending players) |
| `players-directory.js`, `player.js`, `card.js` | Player list (pending hidden), profile page (pending hidden from public, visible to its owner), downloadable QR card generator — genericized so referees/officials/teams can use it too |
| `verify.js` | Public `/verify.html?cpl=...` QR scan lookup |
| `referees.js`, `officials.js` | Referees / CPL officials — card grid with photos; Contact info is admin-only, not shown publicly |
| `equipment.js`, `gallery.js`, `enquiries.js` | Equipment list, media gallery, enquiries form |
| `transfers.js` | Public `/transfers.html` — transfer announcements, admin-managed |
| `admin.js` | Admin dashboard (`/admin.html`, not in the public nav) — approvals (auto-adds teams to Standings), standings, fixtures/results (League A/B select + referee tagging), player stats, gallery, equipment, documents, season/links, transfers, **transfer requests**, news, password change |
| `BACKEND-TODO.md` | Apps Script (`code.gs`) changes required to fully wire up this update — see it before assuming everything above is live |

## Known, intentional limits

- No server-side sessions — the player's password is re-sent (from
  `sessionStorage`) on every write. Fine for a small community site over
  HTTPS; not bank-grade.
- Passwords are salted SHA-256, not a slow KDF (Apps Script has no
  bcrypt/scrypt available).
- Team and referee registrations never self-activate — an admin always
  does the final step by hand in the Sheet.
