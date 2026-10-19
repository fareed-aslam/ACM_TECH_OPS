# Tech Trivia — ACM Live Quiz App

A real-time, live trivia platform for ACM events. Students join via QR code or PIN, answer unique shuffled questions on a per-question timer, and compete on a live leaderboard.

## Tech Stack
- **Next.js 15** (App Router, TypeScript)
- **MongoDB Atlas** (via Mongoose)
- **KaTeX** (for math rendering)
- **JWT** (student + admin auth)
- **Vercel** (deployment target)

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
MONGODB_URI=mongodb+srv://...
ADMIN_PASSWORD=your_admin_password
JWT_SECRET=your_jwt_secret
NEXT_PUBLIC_API_URL=    # leave empty for same-origin
```

## Running Locally

```bash
npm install
npm run dev
```

## Deploying to Vercel

1. Push this repo to GitHub
2. Import into [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `MONGODB_URI`
   - `ADMIN_PASSWORD`
   - `JWT_SECRET`
   - `NEXT_PUBLIC_API_URL` (leave blank for same-origin)
4. Deploy!

## Pages

| Route | Description |
|-------|-------------|
| `/` | Student join page |
| `/play` | Student quiz view |
| `/screen` | Projector leaderboard |
| `/admin` | Admin control panel |

## Admin Features
- Import questions via CSV
- Set PIN, timer, questions per student (up to 20)
- Start / End / Reset game
- Download results CSV
