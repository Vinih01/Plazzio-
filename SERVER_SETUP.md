# Runtime setup for the secure checkout

The /api/orders endpoint and /api/upload-review-photo route use the Firebase Admin SDK from the Express server. They intentionally do not fall back to direct client-side writes or temporary local files.

## Required runtime configuration

Set these environment variables in the server runtime:

- FIREBASE_PROJECT_ID=loyal-defender-tw1xt
- FIRESTORE_DATABASE_ID=ai-studio-plazzio-53fc4ac7-7ba6-47aa-8e6f-60e99c984f74
- FIREBASE_STORAGE_BUCKET=loyal-defender-tw1xt.firebasestorage.app

The runtime must provide **Application Default Credentials (ADC)**. In Google Cloud Run, use the service account assigned to the service. Do not commit service-account JSON, private keys, access tokens, or credentials to this repository.

## Minimum IAM permissions

Grant the Cloud Run service account access only to the resources it needs:

- Firestore read/write access to the configured Firestore database (for example, the appropriate Firestore/Datastore user role).
- Object creation/read access for the Firebase Storage bucket used for review photos (prefer bucket-level IAM where available).

The Admin SDK bypasses Firestore Security Rules. Therefore the endpoint itself verifies the Firebase ID token, derives the customer UID from that verified token, and rebuilds item prices from the store/product/template documents before writing. Keep the client-side rule allow create: if false for orders; do not reopen direct browser writes.

## Before enabling real orders

1. Configure ADC and the environment variables in the environment that actually runs server.ts.
2. Ensure the store has status: "approved", published: true, a numeric delivery fee, and at least one valid entry in acceptedPaymentMethods.
3. Ensure purchasable products are saved in products with the correct storeId, available: true, and up-to-date prices.
4. For products that rely on default option templates, seed the corresponding documents in globalOptionGroupTemplates. The server rejects the order if it cannot resolve the template/options authoritatively.
5. Run CI and Firebase Emulator tests before merging/deploying. The included pricing unit tests do not replace Firestore permission tests or a real authenticated end-to-end checkout test.

## Current limitations

- Products with configured comboGroups are intentionally rejected by the secure checkout until combo selections can be captured and validated server-side.
- Photos from the new upload route are stored in Firebase Storage. Legacy images whose URLs point to /uploads/reviews/... may still depend on files from an old server instance and need a separate migration if they are still required.
- The server response confirms order creation but does not collect or settle online payments. Current payment methods are direct-to-store (Pix, card or cash at delivery), as configured by the store.
