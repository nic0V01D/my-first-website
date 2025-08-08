CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  job_position VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  resume_path VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE spam_protection (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  last_submission TIMESTAMP NOT NULL,
  submission_count INT DEFAULT 1
);