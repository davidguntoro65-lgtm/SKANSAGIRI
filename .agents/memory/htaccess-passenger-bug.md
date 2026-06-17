---
name: cPanel .htaccess Passenger API routing bug
description: RewriteRule to a physical file (app.js) causes Apache to serve it as static, bypassing Passenger. Fix: use RewriteRule ^ - [L] for API routes.
---

## Rule
Never rewrite API routes to `app.js` (or any physical file) in `.htaccess` when Passenger is enabled. Use `RewriteRule ^ - [L]` instead so Passenger handles them natively.

**Why:**
When `RewriteRule ^ app.js [L]` fires, Apache finds `app.js` is a real physical file. Even with `PassengerEnabled On`, Apache's static-file serving priority means it returns the raw file content — the JS comment `// cPanel / Phusion Passenger entry point...` — as the response body. The frontend then fails `JSON.parse("// cPanel...")` with "Unexpected token '/'".

**How to apply:**
In `.htaccess` for any cPanel Passenger Node.js app, API route handling should look like:
```apache
# API: stop rewriting, let Passenger forward natively
RewriteCond %{REQUEST_URI} ^/id/api/ [NC]
RewriteRule ^ - [L]
```
Static assets can still use `RewriteRule ^assets/(.+)$ dist/assets/$1 [L]` because those ARE physical files and bypassing Passenger for them is correct and efficient.
