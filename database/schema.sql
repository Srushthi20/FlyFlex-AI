CREATE DATABASE IF NOT EXISTS flight_rescheduling_db;
USE flight_rescheduling_db;

CREATE TABLE IF NOT EXISTS app_users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'USER',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flights (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  airline VARCHAR(100) NOT NULL,
  flight_number VARCHAR(20) NOT NULL,
  origin_code VARCHAR(10) NOT NULL,
  destination_code VARCHAR(10) NOT NULL,
  departure_at DATETIME NOT NULL,
  arrival_at DATETIME NOT NULL,
  duration_minutes INT NOT NULL,
  fare DECIMAL(10,2) NOT NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  change_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  flexibility_score INT NOT NULL DEFAULT 3
);

CREATE TABLE IF NOT EXISTS rescheduling_requests (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  original_booking_reference VARCHAR(60) NOT NULL,
  origin_code VARCHAR(10) NOT NULL,
  destination_code VARCHAR(10) NOT NULL,
  original_departure_date DATE NOT NULL,
  revised_exam_completion_date DATE NOT NULL,
  buffer_days INT NOT NULL DEFAULT 1,
  selected_flight_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  original_ticket_credit DECIMAL(10,2) NOT NULL DEFAULT 0,
  new_fare DECIMAL(10,2) NOT NULL,
  change_fee DECIMAL(10,2) NOT NULL,
  additional_payment DECIMAL(10,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'SIMULATED_REQUESTED',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_request_flight FOREIGN KEY (selected_flight_id) REFERENCES flights(id),
  CONSTRAINT fk_request_user FOREIGN KEY (user_id) REFERENCES app_users(id)
);

INSERT INTO flights (airline, flight_number, origin_code, destination_code, departure_at, arrival_at, duration_minutes, fare, available, change_fee, flexibility_score)
SELECT 'Demo Air', 'DA201', 'BLR', 'DEL', '2026-11-02 09:00:00', '2026-11-02 11:50:00', 170, 6000, TRUE, 200, 4
WHERE NOT EXISTS (SELECT 1 FROM flights WHERE flight_number='DA201' AND departure_at='2026-06-24 09:00:00');
INSERT INTO flights (airline, flight_number, origin_code, destination_code, departure_at, arrival_at, duration_minutes, fare, available, change_fee, flexibility_score)
SELECT 'Demo Air', 'DA205', 'BLR', 'DEL', '2026-11-03 14:00:00', '2026-11-03 16:50:00', 170, 5700, TRUE, 200, 3
WHERE NOT EXISTS (SELECT 1 FROM flights WHERE flight_number='DA205' AND departure_at='2026-06-25 14:00:00');
INSERT INTO flights (airline, flight_number, origin_code, destination_code, departure_at, arrival_at, duration_minutes, fare, available, change_fee, flexibility_score)
SELECT 'Example Airlines', 'EA410', 'BLR', 'DEL', '2026-11-04 18:30:00', '2026-11-04 21:20:00', 170, 5500, TRUE, 350, 5
WHERE NOT EXISTS (SELECT 1 FROM flights WHERE flight_number='EA410' AND departure_at='2026-06-26 18:30:00');
INSERT INTO flights (airline, flight_number, origin_code, destination_code, departure_at, arrival_at, duration_minutes, fare, available, change_fee, flexibility_score)
SELECT 'Demo Air', 'DA101', 'DEL', 'BLR', '2026-11-02 10:00:00', '2026-11-02 12:50:00', 170, 6200, TRUE, 200, 4
WHERE NOT EXISTS (SELECT 1 FROM flights WHERE flight_number='DA101' AND departure_at='2026-06-24 10:00:00');
