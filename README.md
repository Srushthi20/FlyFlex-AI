# FlyFlex-AI — Flight Rescheduling Assistant

React + Vite frontend, Java 21 / Spring Boot backend, MySQL database, and a separate Python AI service.

**Academic prototype only:** flights, fares, delay predictions and rescheduling requests are simulated. It does not contact airlines, issue tickets, charge UPI, or transfer/refund money.

## Implemented in this project update
- Email/password registration and login backed by MySQL and BCrypt.
- JWT bearer authentication on protected backend APIs.
- User-scoped rescheduling history; a user cannot request another user's history by changing a frontend ID.
- Admin-only endpoints and an admin overview in the frontend.
- Admin account role is assigned only when the registered email matches `ADMIN_EMAIL` configured on the backend.
- Python AI service endpoints for Sentence-BERT semantic flight matching and XGBoost delay estimation.

## 1. MySQL setup
For a **new database**, run `database/schema.sql` in MySQL Workbench.

For a database created with the older version of this project, back up the database first and run `database/migrate_auth.sql` once. Do not run the migration twice.

## 2. Backend setup (Windows PowerShell)
Set the DB password and admin email in the same PowerShell terminal before starting Spring Boot:

```powershell
$env:DB_PASSWORD = "YOUR_LOCAL_MYSQL_PASSWORD"
$env:ADMIN_EMAIL = "admin@example.com"
cd C:\Users\Dynabook\Downloads\flight-rescheduling-system\flight-rescheduling-system\backend
.\mvnw.cmd spring-boot:run
```

Replace the sample admin email with the email you want to use. Register that email after the backend is started; only that account receives the ADMIN role. Do not put the database password in source files or share it in chat.

The default JWT secret is for local demonstration only. For a deployment, set `JWT_SECRET` to a private Base64-encoded random key of at least 32 decoded bytes. Keep it secret.

Backend: http://localhost:8080

## 3. Frontend
Open a second terminal:

```powershell
cd C:\Users\Dynabook\Downloads\flight-rescheduling-system\flight-rescheduling-system\frontend
npm.cmd install
npm.cmd run dev
```

Open http://localhost:5173. Create an account, then sign in. Wrong passwords are rejected by the backend. Use the Log out button to end the local session.

## 4. AI service (Python 3.11+)
Open a third terminal:

```powershell
cd C:\Users\Dynabook\Downloads\flight-rescheduling-system\flight-rescheduling-system\ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python train_model.py
uvicorn app:app --reload --port 8000
```

The first Sentence-BERT request downloads `sentence-transformers/all-MiniLM-L6-v2`, so the first use needs internet and several hundred MB of disk space. XGBoost is trained from generated synthetic examples. These are demonstrations, not accurate real-world flight predictions.

AI docs: http://localhost:8000/docs

### AI endpoints
- `POST /match-flights` — SBERT semantic matching from a passenger preference sentence and candidate flight list.
- `POST /predict-delay` — XGBoost estimated delay from route, hour, weekday, month, demand and weather-risk inputs.
- Spring Boot authenticated proxy endpoints: `POST /api/ai/match-flights` and `POST /api/ai/predict-delay`.

## Security and prototype limitations
- Admin access is enforced by Spring Security roles, not by hiding frontend buttons.
- User request history is filtered by the email in the validated JWT.
- Existing old rescheduling rows are attached to a non-login legacy account by the migration script.
- The current booking flow is still a **request simulation**. Seat locking/decrement, payment confirmation, refund simulation, and true original-booking ownership are not yet implemented. Do not treat the current request confirmation as a real rebooking.
- General flight search and recommendations use the sample database and hard eligibility filters. SBERT is available through the AI endpoint but still needs to be connected to the recommendation ranking UI in a subsequent integration step.
