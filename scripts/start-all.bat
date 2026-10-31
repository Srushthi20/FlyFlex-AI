@echo off
echo Start each service in a separate terminal for easier troubleshooting.
echo 1. Backend: cd backend ^&^& mvn spring-boot:run
echo 2. Frontend: cd frontend ^&^& npm install ^&^& npm run dev
echo 3. AI service: cd ai-service ^&^& python -m venv .venv ^&^& .venv\Scripts\activate ^&^& pip install -r requirements.txt ^&^& python train_model.py ^&^& uvicorn app:app --reload --port 8000
echo Make sure MySQL is running and database/schema.sql has been executed.
pause
