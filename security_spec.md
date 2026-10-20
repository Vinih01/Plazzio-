# Security Specification & Threat Model — Plazzio

## 1. Data Invariants & Security Boundaries
- **Identity Invariant**: A user cannot impersonate another UID in any document creation (`ownerUid == request.auth.uid`, `customerUid == request.auth.uid`).
- **Privilege Invariant**: A merchant or consumer cannot escalate their role to `admin` or alter administrative fields (`role`, `status`, `rejectionReason`).
- **Store Approval Isolation**: A store owner can only update draft information and submit for review (`draft` -> `pending_review`). Only a verified platform administrator can transition status to `approved`, `rejected`, or `suspended`.
- **Order Integrity**: A customer can only create orders where `customerUid == request.auth.uid`. A customer cannot read or list another customer's orders.
- **Store Isolation**: A merchant can only view and update orders for stores they own (`store.ownerUid == request.auth.uid`). A merchant cannot view other stores' orders.
- **Order State Progression**: Order status transitions are restricted to valid business workflows (`pending_confirmation` -> `accepted` -> `preparing` -> `ready_for_pickup` / `out_for_delivery` -> `delivered` / `completed`). Customers may only cancel pending orders.
- **Audit Tampering**: Audit logs cannot be modified or deleted by anyone once created, and can only be written and read by authorized administrators.

## 2. The Dirty Dozen Threat Payloads (Targeting PERMISSION_DENIED)
1. **Payload 1 (Self-Promotion to Admin)**: Non-admin user sets `role: "admin"` in `/users/{userId}`.
2. **Payload 2 (Ghost Field Injection)**: Store creation payload contains illegal property `__debugBackdoor: true`.
3. **Payload 3 (Owner Forgery)**: User creates store with `ownerUid: "victim-uid"`.
4. **Payload 4 (Self-Approval Attack)**: Store owner sets `status: "approved"` directly on their pending store.
5. **Payload 5 (Cross-Store Product Injection)**: Merchant A creates product under Store B's `storeId`.
6. **Payload 6 (Cross-Tenant Order Reading)**: Merchant A attempts to query orders for Merchant B's store.
7. **Payload 7 (Customer Order Hijacking)**: Customer A attempts to read Customer B's order `/orders/{orderB}`.
8. **Payload 8 (Order Price Forgery on Client)**: Attempt to update line items or total directly after order placement.
9. **Payload 9 (Terminal State Mutability)**: Attempt to update an order that is already in `completed` or `cancelled` state.
10. **Payload 10 (Audit Log Deletion)**: Attempt to delete an entry from `/auditLogs/{logId}`.
11. **Payload 11 (Unauthenticated Store Publishing)**: Unauthenticated visitor attempts to write to `/stores/{storeId}`.
12. **Payload 12 (Review Forgery)**: User attempts to write a review for an order they did not place.
