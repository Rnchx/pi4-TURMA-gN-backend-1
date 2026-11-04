# syntax=docker/dockerfile:1

# Etapa 1: compila e testa com JDK + Maven Wrapper.
FROM eclipse-temurin:21.0.13_9-jdk-alpine-3.24 AS build
WORKDIR /workspace
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
# Defesa contra CRLF caso o arquivo venha de um checkout Windows sem .gitattributes.
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -q dependency:go-offline
COPY src/ src/
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B package \
    && cp target/confirmacao-java.jar /workspace/app.jar

# Etapa 2: somente JRE, sem Maven, JDK ou código-fonte.
FROM eclipse-temurin:21.0.13_9-jre-alpine-3.24
# Aplica correções de segurança do Alpine publicadas após a imagem base (ex.: libexpat).
RUN apk upgrade --no-cache \
    && addgroup -S -g 10001 safra && adduser -S -D -H -u 10001 -G safra safra
WORKDIR /app
COPY --from=build --chown=safra:safra /workspace/app.jar app.jar
USER 10001:10001
ENV SERVER_PORT=8080
EXPOSE 8080
# Forma exec: o Java é o PID 1 e recebe o SIGTERM de "docker compose stop" para o encerramento gracioso.
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
