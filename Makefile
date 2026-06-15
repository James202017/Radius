.PHONY: up down logs ps db test build frontend backend

up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f

ps:
	docker compose ps

db:
	docker exec -it radius_db psql -U radius -d radius_db

db-init:
	docker exec -i radius_db psql -U radius -d radius_db < init_db.sql

backend-logs:
	docker logs -f radius_backend

frontend-logs:
	docker logs -f radius_frontend

db-logs:
	docker logs -f radius_db

redis-logs:
	docker logs -f radius_redis

build:
	docker compose build --no-cache

test:
	docker compose exec backend pytest -v

lint:
	docker compose exec backend ruff check .

clean:
	docker compose down -v
	docker system prune -f

