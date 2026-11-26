# Crore Bet deployment notes

The projects are configured for local development today. Set the final public addresses and credentials on the server before releasing the app.

## Backend

Use Node.js 22 or newer and PostgreSQL. In `CroreBet-backend`, install dependencies, generate the Prisma client, build, and start:

```sh
npm ci
npx prisma generate
npm run build
npm start
```

Set `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `AES_KEY`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and `BREVO_SENDER_NAME` in the server environment. Admin two-factor authentication also needs `ADMIN_JWT_SECRET`. Configure `MC_AUTH_TOKEN` and `MC_CUSTOMER_ID` for password-recovery OTPs, and `FIREBASE_SERVICE_ACCOUNT` or a server-side Firebase service-account file for push notifications. Do not commit credentials. Set `UPLOAD_ROOT` to the existing upload directory (default `/var/www/rajvardhan/uploads`); the backend user must be able to write there. Configure the web server to serve `/uploads/` from this same directory without executing uploaded files, and persist it across deployments.

Back up the database, then run `npx prisma migrate deploy` against the intended production database before starting the updated backend. The support status table requires migration `20261126150000_add_support_conversation_status`. If the actual frontend origins differ from the origins already in `src/server.ts`, set `CORS_ORIGINS` to a comma-separated list of exact HTTPS origins. Run one scheduler instance until a distributed scheduler is configured.

## Website and admin

Run `npm ci` and `npm run build` separately in `CroreBet` and `CroreBet-admin`. Set `VITE_APP_DOWNLOAD_URL` to the final APK download URL when building the website. Serve each `dist` directory from its own host. The web server must proxy `/api` to the backend and send frontend routes to `index.html`; the Vite development proxy does not apply to production builds. Use HTTPS and preserve the forwarded protocol so admin cookies work correctly.

## Android app

The local debug app uses the current Wi-Fi address. Release builds must specify the public backend address and use the owner's signing key:

```sh
flutter build apk --release --dart-define=API_BASE_URL=https://YOUR_BACKEND_HOST/
```

Copy `android/key.properties.example` to `android/key.properties` and configure an existing release keystore. The properties file and keystore must remain private. Share Now uses `https://crorebet.com/register`; deploy the website there or update the link before launch. The registration page displays the referral code for manual entry in the app; it is not automatically transferred to the app.
