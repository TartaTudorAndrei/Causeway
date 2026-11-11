# Build stage
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app

# Copy gradle wrapper and config files
COPY gradle/ gradle/
COPY gradlew gradlew.bat settings.gradle build.gradle ./

# Fix line endings and permissions for gradlew
RUN sed -i 's/\r$//' gradlew && \
    chmod +x gradlew

# Download dependencies (caching layer)
RUN ./gradlew dependencies --no-daemon

# Copy source and build executable jar
COPY src/ src/
RUN ./gradlew build -x test --no-daemon

# Locate and stage the jar
RUN mv build/libs/*SNAPSHOT.jar build/libs/app.jar

# Run stage
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/build/libs/app.jar app.jar

# Expose port
EXPOSE 8080

# Run the app
ENTRYPOINT ["java", "-jar", "app.jar"]
