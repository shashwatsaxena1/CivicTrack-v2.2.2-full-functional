# CivicTrack v2 Architecture

Web and mobile share one API and one PostgreSQL/PostGIS database. MinIO is used locally as an S3-compatible object-storage target. The API is ESM/NodeNext so top-level await is supported. Authentication uses Argon2 hashing at the foundation; production sessions, refresh-token rotation and MFA must be completed before production use.

## Truth rule

Submitted, pending review, location verified, evidence verified, government verified, and completed are distinct states. The UI must never fabricate a verification state.
