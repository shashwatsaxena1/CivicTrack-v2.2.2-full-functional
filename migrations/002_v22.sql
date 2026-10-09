CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS contractor_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolution_note text;
ALTER TABLE complaints ALTER COLUMN support_count SET DEFAULT 0;
CREATE TABLE IF NOT EXISTS complaint_supports (
  complaint_id uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (complaint_id,user_id)
);
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS object_key text;
UPDATE evidence SET object_key='legacy/'||id::text||'/'||regexp_replace(file_name,'[^a-zA-Z0-9._-]','','g') WHERE object_key IS NULL;
ALTER TABLE evidence ALTER COLUMN object_key SET NOT NULL;
CREATE INDEX IF NOT EXISTS evidence_sha_idx ON evidence(sha256);
CREATE INDEX IF NOT EXISTS complaints_project_idx ON complaints(project_id);
CREATE INDEX IF NOT EXISTS evidence_project_idx ON evidence(project_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_logs(created_at DESC);
CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'audit_logs is append-only'; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS audit_logs_no_update ON audit_logs;
DROP TRIGGER IF EXISTS audit_logs_no_delete ON audit_logs;
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
