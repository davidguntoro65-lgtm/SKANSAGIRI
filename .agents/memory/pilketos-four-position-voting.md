---
name: Four-position Pilketos voting
description: Product rules and compatibility decisions for the four-role student election
---

Voter access is intentionally limited to entering NIS or NISN; do not require a password or CoreUser session for the e-voting page. NIS/NISN identifies a student record but does not prove who is entering it, so anyone who knows another student's number could impersonate that student.

**Why:** The user asked students to go directly to voting with NIS/NISN only while preserving one ballot per student.

**How to apply:** Resolve the identifier to an active student on the server, and continue enforcing the one-ballot transaction, schedule, candidate-grade, and duplicate-choice rules server-side.

Each student has one ballot per election containing four choices: Ketua Umum and Ketua 1 from the four grade XI candidates, plus Ketua 2 and Ketua 3 from the four grade X candidates. The same candidate cannot be selected for both roles in either grade pair. Admin scores are tallied independently for each role.

**Why:** The user specified exactly eight candidates (four from each grade), one voting right per NIS/NISN/student, and four role-specific results.

**How to apply:** Resolve NIS and NISN to the same student record; validate and save all four roles atomically. Keep position as part of each vote's identity, and never combine votes from different roles in admin results.

Existing votes from the earlier two-grade flow are retained under separate legacy positions. They still block another ballot for that student, but are excluded from the four new role tallies because their original role cannot be determined reliably.

**Why:** This preserves previous records without assigning them an invented office or allowing existing voters to cast another ballot.

**How to apply:** Do not migrate legacy votes into Ketua Umum/Ketua 1/Ketua 2/Ketua 3 unless a verified mapping is supplied.

The user clarified the report labels: KETUA_3 is displayed as Ketua 2 and KETUA_4 as Ketua 3; stored position IDs and vote history stay unchanged. For additional ranks 5–8, exclude candidates already listed as office winners, then use only one role score per remaining candidate: Ketua Umum for grade XI and Ketua 2 for grade X. Never sum scores across roles.

**Why:** The user corrected the displayed office names and explicitly confirmed grade eligibility and that cross-position totals must not be combined.

**How to apply:** Keep the historical enum mapping at the presentation layer. Rank remaining grade XI candidates from their KETUA_UMUM counts and grade X candidates from their KETUA_3 counts; surface ties instead of summing votes.

Automatic voting schedules use WIB for both start and end instants, with input and displayed time precise to the second. Supplying one time requires supplying both; the end must be later than the start. With neither time set, an OPEN election stays in manual mode.

**Why:** Admin input is local school time, while the app server and student devices may use different time zones or clocks.

**How to apply:** Preserve seconds when converting the WIB form values to instants and when displaying them. Normalize schedule input to WIB before storing it, calculate the countdown from server time, and enforce both boundaries again in the vote endpoint. Treat the scheduled phase as authoritative even when the persisted election status remains OPEN.