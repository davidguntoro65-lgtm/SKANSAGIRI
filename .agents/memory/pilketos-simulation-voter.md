---
name: Pilketos simulation voter
description: Temporary NIS reserved for testing Pilketos before real production elections.
---

NIS `10101010` is a dummy voter for development simulations only. It must not be seeded or accepted by the production Pilketos API; remove the test record and its special handling when the simulation account is retired.

**Why:** The user requested a hardcoded test identity now and specified that it must be removed for production use.

**How to apply:** Keep the development seed and API behavior in sync, preserve production-mode rejection, and do not copy this student or its votes into a real election database.
