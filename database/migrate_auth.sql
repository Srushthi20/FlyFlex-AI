USE flight_rescheduling_db;
CREATE TABLE IF NOT EXISTS app_users (
 id BIGINT PRIMARY KEY AUTO_INCREMENT, full_name VARCHAR(100) NOT NULL,
 email VARCHAR(150) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
 role VARCHAR(20) NOT NULL DEFAULT 'USER', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Keep existing history visible to an explicitly labelled legacy owner. This account has no usable login.
INSERT INTO app_users(full_name,email,password_hash,role)
SELECT 'Legacy demo records','legacy-records@flyflex.local', '$2a$10$7EqJtq98hPqEX7fNZaFWoO5u3s9p6bQ0w5b6Qx0w5b6Qx0w5b6QxK','USER'
WHERE NOT EXISTS (SELECT 1 FROM app_users WHERE email='legacy-records@flyflex.local');
ALTER TABLE rescheduling_requests ADD COLUMN user_id BIGINT NULL;
UPDATE rescheduling_requests SET user_id=(SELECT id FROM app_users WHERE email='legacy-records@flyflex.local') WHERE user_id IS NULL;
ALTER TABLE rescheduling_requests MODIFY user_id BIGINT NOT NULL;
ALTER TABLE rescheduling_requests ADD CONSTRAINT fk_request_user FOREIGN KEY (user_id) REFERENCES app_users(id);
