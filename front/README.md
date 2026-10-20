# Frontend runtime

- Node.js `^20.19.0 || >=22.12.0` is required by the locked Vite 7 toolchain.
  The dev container uses the Node 20 line; use a current Node 20 release or
  Node `>=22.12.0` for local development.
- Run `npm ci`, `npm run lint`, `npm run build`, and `node --test tests/*.test.js`
  from this directory.
- `VITE_API_URL` sets the API base URL, including `/api`. The default is the
  same-origin `/api`, which is suitable when the frontend and API share an
  origin. For the current local setup, `front/.env.local` keeps the API at
  `https://127.0.0.1:8000/api`; that file is ignored by Git.
