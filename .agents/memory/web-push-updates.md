---
name: Web Push updates
description: Push notification design and deployment constraints for the school PWA.
---

## Rule

Store browser push subscriptions in the existing settings JSON store rather than adding a database table. Notify subscribers when public school content is newly added or published; do not send for edits, reactions, or submissions still awaiting approval. The server must receive its VAPID key pair through environment configuration.

**Why:** This project already persists CMS collections in the database and targets a cPanel deployment under `/id`. Avoiding a schema migration reduces deployment risk, while limiting pushes to newly public content avoids notification spam and private-submission leaks.

**How to apply:** Keep client API requests base-path aware and notification click targets relative to the service-worker scope. Configure matching VAPID public/private keys in the deployed Node.js environment; never commit the private key.
