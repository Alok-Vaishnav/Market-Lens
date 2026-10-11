# Market Lens

Market Lens is a React company-research interface backed by an Express API and MongoDB Atlas. The frontend only communicates with the application's own API.

## Architecture

- React, TypeScript, Vite, Tailwind CSS, and React Router frontend.
- Express and Mongoose backend in the sibling `server/` folder.
- MongoDB database `stockDB`, collection `companies`.

## Setup

Install frontend dependencies:

```bash
npm install
```

Configure the backend:

```bash
copy ..\server\.env.example ..\server\.env
```

Set `BHARATSTOCK_API_KEY` to your own active BharatStock API key. The value in `server/.env.example` is only a placeholder; do not use it or commit a real key. The key is server-only and must never be placed in a Vite environment file.

Restart the backend after changing `server/.env` so the new key is loaded. If company search returns `503`, verify that the key is active and has access to the BharatStock API.

Configure the frontend if the backend is not running on the default address:

```env
VITE_API_BASE_URL=http://localhost:8005/api
```

Run the applications in separate terminals:

```bash
npm run dev
npm run server:dev
```

Company records are read through the server-side BharatStock proxy. Missing financial values remain `null` and are rendered as `N/A`.

## API

- `GET /api/health`
- `GET /api/companies`
- `GET /api/companies/search?q=Reliance`
- `GET /api/companies/RELIANCE`

## Unsupported features

This focused interface does not include large historical price or volume charts, moving averages, technical analysis, balance sheet, cash flow, shareholding, peer comparison, documents, announcements, corporate actions, or investment advice.
