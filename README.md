================================================================================
                    RIDEBOOK — 4-BRANCH DISTRIBUTION PLAN
================================================================================

Each branch builds on the previous one. All 4 members work in parallel and
merge sequentially: Branch 1 → 2 → 3 → 4 into main.

================================================================================
BRANCH 1: feature/project-setup-and-models
================================================================================
Owner: Member 1
Focus: Project skeleton, database models, security & authentication

Files:
  pom.xml
  src/main/resources/application.properties
  src/main/java/com/ridebook/RideBookApplication.java
  src/main/java/com/ridebook/model/UserRole.java
  src/main/java/com/ridebook/model/RideStatus.java
  src/main/java/com/ridebook/model/User.java
  src/main/java/com/ridebook/model/DriverProfile.java
  src/main/java/com/ridebook/model/Ride.java
  src/main/java/com/ridebook/dto/AuthRequest.java
  src/main/java/com/ridebook/dto/AuthResponse.java
  src/main/java/com/ridebook/dto/RegisterRequest.java
  src/main/java/com/ridebook/repository/UserRepository.java
  src/main/java/com/ridebook/repository/DriverProfileRepository.java
  src/main/java/com/ridebook/repository/RideRepository.java
  src/main/java/com/ridebook/security/JwtUtil.java
  src/main/java/com/ridebook/security/JwtAuthFilter.java
  src/main/java/com/ridebook/security/SecurityConfig.java
  src/main/java/com/ridebook/controller/AuthController.java
  src/main/java/com/ridebook/config/DataSeeder.java
  .mvn/wrapper/maven-wrapper.properties
  mvnw.cmd

Total: 21 files
Responsibility: Project foundation — models, enums, DTOs, repositories,
                JWT auth, security config, database seeding, Maven setup.

================================================================================
BRANCH 2: feature/core-services-and-api
================================================================================
Owner: Member 2
Focus: Business logic services, REST controllers, fare & matching algorithms

Files:
  src/main/java/com/ridebook/dto/RideRequest.java
  src/main/java/com/ridebook/dto/RideResponse.java
  src/main/java/com/ridebook/dto/FareEstimate.java
  src/main/java/com/ridebook/dto/DriverInfo.java
  src/main/java/com/ridebook/dto/LocationUpdate.java
  src/main/java/com/ridebook/service/GeoLocationService.java
  src/main/java/com/ridebook/service/FareCalculatorService.java
  src/main/java/com/ridebook/service/MatchingService.java
  src/main/java/com/ridebook/service/RideService.java
  src/main/java/com/ridebook/controller/RideController.java
  src/main/java/com/ridebook/controller/DriverController.java
  src/main/java/com/ridebook/websocket/WebSocketConfig.java
  src/main/java/com/ridebook/websocket/LocationController.java

Total: 13 files
Responsibility: Haversine matching algorithm, fare calculator, ride lifecycle
                management, driver/rider REST APIs, WebSocket STOMP config,
                real-time location broadcasting.

================================================================================
BRANCH 3: feature/frontend-core-and-auth
================================================================================
Owner: Member 3
Focus: Frontend project setup, styling, auth pages, shared services

Files:
  frontend/package.json
  frontend/vite.config.js
  frontend/index.html
  frontend/src/main.jsx
  frontend/src/App.jsx
  frontend/src/index.css
  frontend/src/services/api.js
  frontend/src/services/websocket.js
  frontend/src/services/routing.js
  frontend/src/pages/Login.jsx
  frontend/src/pages/Register.jsx

Total: 11 files
Responsibility: Vite + React project scaffold, dark glassmorphism CSS design
                system, Axios HTTP client with JWT interceptor, STOMP WebSocket
                client, OSRM road routing service, Nominatim geocoding,
                login page with demo buttons, registration with role toggle.

================================================================================
BRANCH 4: feature/dashboards-and-maps
================================================================================
Owner: Member 4
Focus: Rider & Driver dashboards with Leaflet maps, real-time tracking UI

Files:
  frontend/src/pages/RiderDashboard.jsx
  frontend/src/pages/DriverDashboard.jsx

Total: 2 files (but these are the two largest files ~250 lines each)
Responsibility: Leaflet map integration with OpenStreetMap, pickup/drop marker
                placement, OSRM road route rendering on map, fare estimate
                display, ride booking flow, real-time driver tracking via
                WebSocket, driver online toggle, ride request popup with 15s
                countdown timer, trip start/complete controls, driver movement
                simulation along roads, trip summary with star rating, ride
                history view.

================================================================================
                         FILE COUNT SUMMARY
================================================================================

  Branch 1 (project-setup-and-models)    : 21 files  — Foundation & Auth
  Branch 2 (core-services-and-api)       : 13 files  — Backend Logic & APIs
  Branch 3 (frontend-core-and-auth)      : 11 files  — Frontend Foundation
  Branch 4 (dashboards-and-maps)         :  2 files  — Main UI (largest code)

  TOTAL                                  : 47 files

Note: While Branch 4 has fewer files, the two dashboard files contain the
bulk of the frontend logic (~500 lines combined) — map interactions, WebSocket
subscriptions, real-time tracking, and the entire ride flow UI. This balances
the workload across all 4 branches.

================================================================================
                         MERGE ORDER
================================================================================

  1. feature/project-setup-and-models  →  main
  2. feature/core-services-and-api     →  main
  3. feature/frontend-core-and-auth    →  main
  4. feature/dashboards-and-maps       →  main

================================================================================
