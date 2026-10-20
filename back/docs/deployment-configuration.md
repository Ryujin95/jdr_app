# Deployment configuration

## Runtime and build

- PHP `>=8.2` is required by `composer.json`; the development container uses
  PHP 8.3.
- The frontend requires Node.js `^20.19.0 || >=22.12.0` for its locked
  Vite 7 toolchain. The dev container uses the Node 20 line.
- Reproducible frontend installation and checks: `npm ci`, `npm run lint`,
  `npm run build`, and `node --test tests/*.test.js` from `front/`.

## Production environment

Set deployment values outside the repository. In particular:

- Set `APP_ENV=prod` and `APP_DEBUG=0`.
- Supply a unique `APP_SECRET`, the JWT private/public key files, and
  `JWT_PASSPHRASE` through the deployment's secret store. Never commit these
  values or generated private keys.
- Set `CORS_ALLOW_ORIGIN_REGEX` to a fully anchored regular expression for the
  allowed browser origins, for example `^https://story\.example\.org$`. Do not
  include local origins in the production value. CORS credentials remain
  disabled.
- Set the frontend build variable `VITE_API_URL` to `/api` when the API shares
  the frontend origin, or to the API origin plus `/api` when it is hosted
  separately. A separately hosted API must list the frontend's exact origin in
  `CORS_ALLOW_ORIGIN`.

The base CORS policy is fail-closed. The ignored local `back/.env.local` sets
the two Vite development origins, while `back/.env.test` sets the test origins.
A deployment must provide `CORS_ALLOW_ORIGIN_REGEX` explicitly with its
published frontend origin.
