# Backend status

The Apps Script backend for everything below is now implemented in
`../apps-script/code.gs` (paired with this frontend) — see that
project's header comment for one-time setup, and
`../apps-script/SETUP-ADMIN.md` for the admin dashboard specifically.

## Latest additions (this build) — 2026 update

- **Fixed: "No teams yet" in Add Fixture even though a team exists** —
  the Fixtures admin panel only ever looked at `Teams_A`/`Teams_B` and
  approved `Team_Registrations`, but the *only* team-adding control the
  dashboard actually has is Standings' "+ Add Team Row" button. A team
  added only there (the common case) never showed up when adding a
  fixture. The dropdown now also pulls from `Standings_A`/`Standings_B`
  and force-refreshes instead of using stale cached data, so a team
  added or approved moments earlier in the same session shows up
  immediately. **No action needed** — this is a frontend-only fix.
- **Team profile pages now work before an admin adds the team to
  `Teams_A`/`Teams_B` by hand** — `team.html` used to say "not found"
  for any approved team that only existed in `Team_Registrations`.
  It now falls back to that registration's data (name, league, logo)
  so the squad, standing, and fixtures show up right away; a note
  invites the admin to add the richer profile (ground/coach/bio) later.
  **No action needed.**
- **Team-managed photo galleries** — any signed-in team contact can now
  upload photos to their own team's gallery from **My Profile**, shown
  publicly on that team's `team.html` page and moderated by the admin
  from the dashboard's new **Team Galleries** tab (view/delete only —
  teams add their own). See `teamUploadGalleryImage` /
  `teamDeleteGalleryImage` in `code.gs`. **Action needed:** run
  `runFullSetup()` again (safe/idempotent) to create the new
  `Team_Gallery` tab and its Drive upload folder.
- **Two-step transfer approval** — a team-to-team transfer request no
  longer goes straight to the admin. The *releasing* team (the
  player's current club) now has to approve or reject it first, from
  their own **My Profile** page:
  - **Reject** closes the request immediately — no admin involved.
  - **Approve** auto-generates a plain-text transfer document (player,
    clubs, date, note) uploaded to Drive and linked from both teams'
    profile pages, and *that's* what actually reaches the admin's
    **Transfer Requests** tab as something to act on. The admin's
    final approval is unchanged otherwise: it moves the player in
    `Player_Profiles` and posts to the public `Transfers` log.
  - See `teamReviewTransferRequest`, `myIncomingTransferRequests`, and
    `createTransferDocument_` in `code.gs`; `handleAdminReviewTransferRequest_`
    now refuses to approve until the releasing team has said yes.
  - **Action needed:** `Transfer_Requests` gained two columns —
    `Team Decision` and `Document URL` (inserted between `Note` and
    `Status`). If you already have this tab from an earlier build, add
    those two columns by hand (`runFullSetup()` never edits existing
    tabs), then re-run `runFullSetup()` to create the new
    `CPL-Transfer-Documents` Drive folder.
- **Verify page now links into the players directory** —
  `verify.html` (the QR-scan destination) now offers a "search the
  players directory" link both when a CPL number is missing/invalid and
  after a successful lookup, so a visitor can search by name instead of
  only scanning one QR code at a time. **No action needed.**
- **Offline support** — `sw.js` now precaches every page and script in
  the site (previously just a handful), so any page works offline after
  one visit, not only the homepage; `data.js`'s `CPL.get()` also keeps a
  `localStorage` copy of each Sheet tab it reads and falls back to that
  copy (with a visible "showing saved data" banner) if a live fetch
  fails. Registration forms, logins, and anything else that *writes*
  still need a live connection — offline support here is read-only.
  **No action needed** — bump `CPL_CACHE` in `sw.js` (e.g. to
  `'cpl-shell-v3'`) next time you change any cached file, so returning
  visitors actually get the update instead of an old cached copy.

## Previous additions

- **Standings auto-populate per league** — approving a team
  registration (Approvals tab) now automatically adds it, with
  all-zero stats, to `Standings_A` or `Standings_B` — whichever league
  it registered for (see `ensureTeamInStandings_` in `code.gs`). The
  Standings admin tab also has a **"Sync Teams from Registrations"**
  button to catch up any team approved before this existed, or added
  straight into `Teams_A`/`Teams_B` by hand.
- **Referee tagging on fixtures** — `Fixtures_A`/`Fixtures_B` gained a
  `Referee` column. The "Add Fixture" form and the fixtures list in the
  admin dashboard both let you assign one from a dropdown of approved
  referees; the public fixtures list shows it under the score.
  **Action needed:** if your Sheet already has `Fixtures_A`/`Fixtures_B`
  tabs from before this update, add a `Referee` column by hand (any
  position works, but right after `Away` matches the current schema) —
  `runFullSetup()` only creates *missing* tabs, it never edits existing
  ones.
- **Team-to-team transfer requests, admin-gated** — a signed-in team
  can now request to sign a player currently on another team, from
  their **My Profile** page. Nothing changes until an admin approves it
  from the dashboard's new **Transfer Requests** tab: approving moves
  the player to the requesting team (updates `Player_Profiles`) and
  posts an entry to the public `Transfers` log automatically; rejecting
  just closes the request out. See `requestTransfer` / `myTransferRequests`
  / `adminListTransferRequests` / `adminReviewTransferRequest` in
  `code.gs`. **Action needed:** run `runFullSetup()` again (safe/
  idempotent) so the new `Transfer_Requests` tab gets created — nothing
  else needs to change.
- League A vs. League B fixture selection already existed (the toggle
  buttons above "Add Fixture" in the dashboard) — just called out here
  since it's easy to miss.

## What's implemented there

- **`login`** — single action, checks `Player_Profiles`,
  `Team_Registrations`, `Referees`, and `Officials` in turn and returns
  `accountType` + `subtitle` + `cplNumber` so `my-profile.html` can
  render the right card for whichever type signed in.
- **`registerTeam` / `registerReferee` / `registerOfficial`** — all
  three now accept and hash a `password` field the same way
  `registerPlayer` always did; referee/official also accept an optional
  `photoBase64` and upload it to a dedicated Drive folder.
- **CPL numbers for referees/officials** — `Referees` and `Officials`
  both got a `CPL_Number` column. Approving one (via the admin
  dashboard's Approve action, or by hand-editing `Status` to `Active`
  in the Sheet with the installable `onEditTrigger` set up) assigns
  `REF-2026-0001` / `OFC-2026-0001` style numbers, the same way player
  numbers already worked. `verifyCpl` checks all three tables now, so
  referee/official QR cards work end-to-end.
- **`verifyCpl`** returns a generic `subtitle` field (Team for players,
  "Referee" / the official's Role otherwise) — `verify.js` already
  reads this first and falls back to `team` if a subtitle is missing.

## Known, intentional limitation

`Referees` and `Officials` still store one free-text `Contact` column
(phone *or* email) rather than a dedicated `Email` column. `login` and
`my-profile.js`'s lookup both match the signed-in email against that
`Contact` field — this works fine for anyone who registered with an
email address there, but someone who entered a phone number as their
Contact can't log in with an email at all. If that matters for your
league, add a dedicated `Email` column to both tabs and update
`handleLogin_` / `renderRefereeOrOfficialProfile` to match on it
instead — both are small, isolated changes.

## Everything else

Mobile nav, responsive CSS, the pending-profile guard on
`players.html`/`team.html`/`player.html`, and the referee/officials
card-grid layout are all frontend-only and need nothing from the
backend.
