---
name: Four-position Pilketos voting
description: Product rules and compatibility decisions for the four-role student election
---

Each student has one ballot per election containing four choices: Ketua Umum and Ketua 1 from the four grade XI candidates, plus Ketua 3 and Ketua 4 from the four grade X candidates. The same candidate cannot be selected for both roles in either grade pair. Admin scores are tallied independently for each role.

**Why:** The user specified exactly eight candidates (four from each grade), one voting right per NIS/NISN/student, and four role-specific results.

**How to apply:** Resolve NIS and NISN to the same student record; validate and save all four roles atomically. Keep position as part of each vote's identity, and never combine votes from different roles in admin results.

Existing votes from the earlier two-grade flow are retained under separate legacy positions. They still block another ballot for that student, but are excluded from the four new role tallies because their original role cannot be determined reliably.

**Why:** This preserves previous records without assigning them an invented office or allowing existing voters to cast another ballot.

**How to apply:** Do not migrate legacy votes into Ketua Umum/Ketua 1/Ketua 3/Ketua 4 unless a verified mapping is supplied.

Automatic voting schedules use WIB for both start and end instants. Supplying one time requires supplying both; the end must be later than the start. With neither time set, an OPEN election stays in manual mode.

**Why:** Admin input is local school time, while the app server and student devices may use different time zones or clocks.

**How to apply:** Normalize schedule input to WIB before storing it, calculate the countdown from server time, and enforce both boundaries again in the vote endpoint. Treat the scheduled phase as authoritative even when the persisted election status remains OPEN.