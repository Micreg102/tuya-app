# Etap 1: Budowanie aplikacji
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Etap 2: Uruchomienie (lekki obraz)
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Ustawienie zmiennej środowiskowej dla MongoDB
ENV SPRING_DATA_MONGODB_URI=mongodb://mongodb:27017/tuya_iot
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]