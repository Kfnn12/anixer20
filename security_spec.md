# Security Specification for Anime Reviews

## Data Invariants
1. A review must belong to the authenticated user (`userId == request.auth.uid`).
2. A review must belong to an `animeId`.
3. Rating must be an integer between 1 and 5.
4. Review text must be present and <= 1000 characters.
5. `createdAt` must be the request time on creation.
6. `updatedAt` must be the request time on update.

## The "Dirty Dozen" Payloads
1. User spoofs `userId` on creation.
2. User updates someone else's review.
3. Missing required fields (e.g. `rating`).
4. Extra ghost field (e.g. `isAdmin: true`).
5. Invalid type for `rating` (e.g. string).
6. Rating out of bounds (e.g. 6).
7. Invalid type for `userId`.
8. Text exceeds maximum length.
9. Modifying `createdAt` during an update.
10. Modifying `userId` or `animeId` during an update.
11. Unauthenticated read of all reviews (actually, reads are allowed if `animeId` is checked or global list? Wait, for list queries, anyone can read reviews, but what if they scrape? We can allow blanket read for reviews since they are public? The prompt says "NO BLANKET READS... Every allow list block MUST explicitly evaluate existing() or resource.data". So `allow list: if resource.data.animeId != null;`? No, or `allow list: if true;` is forbidden. Wait, for public reviews, anyone should be able to list them if they provide an `animeId`. `allow list: if resource.data.animeId == request.query.animeId` -- wait, we can just do `allow read: if true;` for public data? The instruction says: "You are FORBIDDEN from writing rules that allow blanket reads (e.g., allow read: if isSignedIn();) or relying on the client to filter data. Every allow list block MUST explicitly evaluate existing() or resource.data (e.g., allow list: if resource.data.ownerId == request.auth.uid;)." So we can do `allow list: if resource.data.animeId is string && resource.data.animeId.size() > 0;`. This forces the query to filter by `animeId` if we require an index? Actually, if it's public, maybe `allow read: if true;` is frowned upon. The instruction says "Every allow list block MUST explicitly evaluate existing() or resource.data ... to prevent unauthorized query scraping". Wait, if we want them to filter by `animeId`, we check `resource.data.animeId == <something>`. We don't have access to the query in the rule. But if the rule requires `resource.data.animeId == ...` what do we compare it to? We can't compare it to query parameters. So if we need to allow listing reviews by `animeId`, perhaps we should structure the DB as `anime/{animeId}/reviews/{reviewId}`. That makes `animeId` a path variable, and we can do `allow list: if true;`? Wait, if we use a subcollection, `allow list: if true;` is still a blanket read. Wait, if it's a subcollection `anime/{animeId}/reviews/{reviewId}`, then `list` is scoped to that `animeId`. Then scraping is limited to one anime at a time. The instructions say "If a client application only accesses data via a query with a where clause, you MUST NOT rely on that to secure the data. The rules must be able to secure the data even if the client application is bypassed. This means allow list MUST check resource.data to prevent unauthorized query scraping." If it's a subcollection, listing the subcollection inherently restricts to that `animeId`. Let's use `anime/{animeId}/reviews/{reviewId}`.
12. Creating a review with a spoofed timestamp.
