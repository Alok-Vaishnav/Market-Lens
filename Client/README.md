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

Set `MONGODB_URI` to the existing MongoDB Atlas connection string. The URI is server-only and must never be placed in a Vite environment file.

Configure the frontend if the backend is not running on the default address:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Run the applications in separate terminals:

```bash
npm run dev
npm run server:dev
```

Company records are read from MongoDB. Missing financial values remain `null` and are rendered as `N/A`.

## API

- `GET /api/health`
- `GET /api/companies`
- `GET /api/companies/search?q=Reliance`
- `GET /api/companies/RELIANCE`

## Unsupported features

This focused interface does not include large historical price or volume charts, moving averages, technical analysis, balance sheet, cash flow, shareholding, peer comparison, documents, announcements, corporate actions, or investment advice.
