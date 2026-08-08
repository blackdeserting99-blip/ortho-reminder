# Ortho Practice Manager

A responsive orthodontic practice dashboard for doctors and clinic staff. Manage patients, appointments, and treatment plans on desktop and mobile.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

This app uses Next.js App Router, Tailwind CSS, and client-side localStorage persistence for patient data.

## Environment Variables

Set these variables in your deployment environment and local `.env` file:

- `DATABASE_URL`: PostgreSQL connection string.
- `META_APP_ID`: Meta app ID used for Embedded Signup.
- `META_APP_SECRET`: Meta app secret used for code exchange.
- `META_EMBEDDED_SIGNUP_CONFIG_ID`: Meta Embedded Signup configuration ID.
- `META_EMBEDDED_SIGNUP_REDIRECT_URI` (optional): Redirect URI used during code exchange, if required by your Meta app config.
- `META_GRAPH_API_VERSION` (optional): Graph API version. Defaults to `v23.0`.
- `WHATSAPP_TOKEN_ENCRYPTION_KEY`: Secret used to encrypt per-doctor WhatsApp access tokens at rest.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
