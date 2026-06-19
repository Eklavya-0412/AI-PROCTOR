.PHONY: build run docker-build compose-up compose-down migrate

build:
	go build -o bin/snippetbox ./cmd/web

run: build
	./bin/snippetbox

docker-build:
	docker build -t snippetbox-app -f starter/Dockerfile .

compose-up:
	docker-compose -f starter/docker-compose.yml up --build

compose-down:
	docker-compose -f starter/docker-compose.yml down --volumes --remove-orphans

migrate:
	docker exec -i $$(docker ps -q -f name=db) mysql -uroot -p$${MYSQL_ROOT_PASSWORD:-root} $${MYSQL_DATABASE:-snippetbox} < starter/schema.sql
