# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS console-build
WORKDIR /build
COPY frontend/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM gradle:9.2.1-jdk21 AS server-build
USER root
RUN mkdir -p /build && chown gradle:gradle /build
USER gradle
WORKDIR /build
COPY --chown=gradle:gradle settings.gradle.kts build.gradle.kts ./
COPY --chown=gradle:gradle backend/ ./backend/
COPY --from=console-build --chown=gradle:gradle /build/dist/ ./backend/src/main/resources/static/
RUN --mount=type=cache,target=/home/gradle/.gradle,uid=1000,gid=1000 gradle :backend:test :backend:bootJar --no-daemon --console=plain

FROM eclipse-temurin:21-jre-alpine AS runtime
RUN addgroup -S -g 10001 app && adduser -S -D -H -u 10001 -G app app
WORKDIR /app
COPY --from=server-build --chown=10001:10001 /build/backend/build/libs/context-bridge.jar app.jar
USER 10001:10001
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+ExitOnOutOfMemoryError"
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
