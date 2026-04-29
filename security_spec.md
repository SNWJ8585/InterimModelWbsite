# Security Specification - Model Viewer App

## Data Invariants
- Each slot ID must be between 1 and 5.
- Only the app owner can modify slot configurations.
- Public can read slot configurations.

## The "Dirty Dozen" Payloads (Red Team)
1. Update slot config without authentication.
2. Update slot config as a non-owner.
3. Inject a 2MB string into the title.
4. Set `modelPath` to a non-existent or malicious path.
5. Create a new slot with ID "6".
6. Delete a slot configuration.
7. Update `updatedAt` with a client-side timestamp instead of server timestamp.
8. Injection of script tags into `description`.
9. Mass-updating slots via collection group query.
10. Spoofing admin role via custom claims (not implemented, using UID check).
11. Reading PII (none in this app yet).
12. Creating a slot with a negative ID.

## Test Runner (Draft)
```ts
// firestore.rules.test.ts
// Tests would verify PERMISSION_DENIED for unauthorized writes to /slots/{slotId}
```
