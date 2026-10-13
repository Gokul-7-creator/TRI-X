# Build React frontend
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./

RUN npm ci

COPY frontend/ ./

RUN npm run build


# Build Java backend
FROM maven:3.9-eclipse-temurin-21 AS backend-build

WORKDIR /app/backend

COPY backend/pom.xml ./

RUN mvn -B dependency:go-offline

COPY backend/src ./src

COPY --from=frontend-build /app/frontend/dist/ ./src/main/resources/static/

RUN mvn -B -DskipTests package


# Run application
FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=backend-build /app/backend/target/triage-x-backend-1.0.0.jar app.jar

EXPOSE 10000

CMD ["java", "-jar", "app.jar"]