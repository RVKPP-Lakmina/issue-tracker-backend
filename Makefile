COMPOSE_FILE := docker-compose.infra.yml

.PHONY: help pull up down restart logs ps clean

help:
	@echo "Available targets:"
	@echo "  make pull    - Pull Mongo and Redis images"
	@echo "  make up      - Start Mongo and Redis in detached mode"
	@echo "  make down    - Stop and remove containers"
	@echo "  make restart - Restart infrastructure"
	@echo "  make logs    - Tail logs for all services"
	@echo "  make ps      - Show container status"
	@echo "  make clean   - Remove containers and named volumes"

pull:
	docker compose -f $(COMPOSE_FILE) pull

up:
	docker compose -f $(COMPOSE_FILE) up -d

down:
	docker compose -f $(COMPOSE_FILE) down

restart: down up

logs:
	docker compose -f $(COMPOSE_FILE) logs -f

ps:
	docker compose -f $(COMPOSE_FILE) ps

clean:
	docker compose -f $(COMPOSE_FILE) down -v --remove-orphans
