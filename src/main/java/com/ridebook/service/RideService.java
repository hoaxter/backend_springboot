package com.ridebook.service;

import com.ridebook.dto.*;
import com.ridebook.model.*;
import com.ridebook.repository.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class RideService {

    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final DriverProfileRepository driverProfileRepository;
    private final MatchingService matchingService;
    private final FareCalculatorService fareCalculatorService;
    private final GeoLocationService geoLocationService;
    private final SimpMessagingTemplate messagingTemplate;

    public RideService(RideRepository rideRepository,
                      UserRepository userRepository,
                      DriverProfileRepository driverProfileRepository,
                      MatchingService matchingService,
                      FareCalculatorService fareCalculatorService,
                      GeoLocationService geoLocationService,
                      SimpMessagingTemplate messagingTemplate) {
        this.rideRepository = rideRepository;
        this.userRepository = userRepository;
        this.driverProfileRepository = driverProfileRepository;
        this.matchingService = matchingService;
        this.fareCalculatorService = fareCalculatorService;
        this.geoLocationService = geoLocationService;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Get fare estimate before booking.
     */
    public FareEstimate getFareEstimate(double pickupLat, double pickupLng,
                                        double dropLat, double dropLng) {
        double distance = geoLocationService.calculateDistance(pickupLat, pickupLng, dropLat, dropLng);
        double duration = geoLocationService.estimateDuration(distance);
        return fareCalculatorService.calculateFare(distance, duration);
    }

    /**
     * Request a new ride.
     */
    @Transactional
    public RideResponse requestRide(Long riderId, RideRequest request) {
        User rider = userRepository.findById(riderId)
                .orElseThrow(() -> new RuntimeException("Rider not found"));

        // Check if rider already has an active ride
        List<Ride> activeRides = rideRepository.findActiveRidesForRider(riderId);
        if (!activeRides.isEmpty()) {
            throw new RuntimeException("You already have an active ride");
        }

        // Calculate fare estimate
        double distance = geoLocationService.calculateDistance(
                request.getPickupLat(), request.getPickupLng(),
                request.getDropLat(), request.getDropLng()
        );
        double duration = geoLocationService.estimateDuration(distance);
        FareEstimate fareEstimate = fareCalculatorService.calculateFare(distance, duration);

        // Create ride
        Ride ride = Ride.builder()
                .rider(rider)
                .pickupLat(request.getPickupLat())
                .pickupLng(request.getPickupLng())
                .pickupAddress(request.getPickupAddress())
                .dropLat(request.getDropLat())
                .dropLng(request.getDropLng())
                .dropAddress(request.getDropAddress())
                .status(RideStatus.REQUESTED)
                .estimatedFare(fareEstimate.getEstimatedFare())
                .distanceKm(fareEstimate.getDistanceKm())
                .durationMinutes(fareEstimate.getDurationMinutes())
                .createdAt(LocalDateTime.now())
                .build();

        ride = rideRepository.save(ride);

        // Find nearest drivers and notify them
        List<DriverInfo> nearbyDrivers = matchingService.findNearestDrivers(
                request.getPickupLat(), request.getPickupLng()
        );

        RideResponse response = toRideResponse(ride);

        // Notify all nearby drivers about the new ride request
        for (DriverInfo driver : nearbyDrivers) {
            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "NEW_RIDE_REQUEST");
            notification.put("ride", response);
            notification.put("distanceToPickup", driver.getDistanceKm());
            messagingTemplate.convertAndSend(
                    "/topic/driver/" + driver.getUserId(),
                    notification
            );
        }

        return response;
    }

    /**
     * Driver accepts a ride.
     */
    @Transactional
    public RideResponse acceptRide(Long driverId, Long rideId) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (ride.getStatus() != RideStatus.REQUESTED) {
            throw new RuntimeException("Ride is no longer available");
        }

        DriverProfile driverProfile = driverProfileRepository.findByUser(driver)
                .orElseThrow(() -> new RuntimeException("Driver profile not found"));

        ride.setDriver(driver);
        ride.setStatus(RideStatus.ACCEPTED);
        ride.setAcceptedAt(LocalDateTime.now());
        ride = rideRepository.save(ride);

        // Mark driver as unavailable
        driverProfile.setIsAvailable(false);
        driverProfileRepository.save(driverProfile);

        RideResponse response = toRideResponse(ride);
        response.setDriverLat(driverProfile.getLatitude());
        response.setDriverLng(driverProfile.getLongitude());

        // Notify rider that driver accepted
        Map<String, Object> riderNotification = new HashMap<>();
        riderNotification.put("type", "RIDE_ACCEPTED");
        riderNotification.put("ride", response);
        messagingTemplate.convertAndSend(
                "/topic/ride/" + rideId,
                riderNotification
        );

        return response;
    }

    /**
     * Driver rejects a ride.
     */
    @Transactional
    public void rejectRide(Long driverId, Long rideId) {
        // The ride stays in REQUESTED status for other drivers
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "RIDE_REJECTED");
        notification.put("rideId", rideId);
        notification.put("driverId", driverId);
        messagingTemplate.convertAndSend("/topic/ride/" + rideId, notification);
    }

    /**
     * Driver starts the trip.
     */
    @Transactional
    public RideResponse startRide(Long driverId, Long rideId) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getDriver().getId().equals(driverId)) {
            throw new RuntimeException("Unauthorized");
        }

        if (ride.getStatus() != RideStatus.ACCEPTED && ride.getStatus() != RideStatus.DRIVER_ARRIVING) {
            throw new RuntimeException("Ride cannot be started in current state");
        }

        ride.setStatus(RideStatus.STARTED);
        ride.setStartedAt(LocalDateTime.now());
        ride = rideRepository.save(ride);

        RideResponse response = toRideResponse(ride);

        // Notify rider
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "RIDE_STARTED");
        notification.put("ride", response);
        messagingTemplate.convertAndSend("/topic/ride/" + rideId, notification);

        return response;
    }

    /**
     * Driver completes the trip.
     */
    @Transactional
    public RideResponse completeRide(Long driverId, Long rideId) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getDriver().getId().equals(driverId)) {
            throw new RuntimeException("Unauthorized");
        }

        if (ride.getStatus() != RideStatus.STARTED) {
            throw new RuntimeException("Ride cannot be completed in current state");
        }

        ride.setStatus(RideStatus.COMPLETED);
        ride.setCompletedAt(LocalDateTime.now());

        // Calculate actual duration
        if (ride.getStartedAt() != null) {
            long actualMinutes = ChronoUnit.MINUTES.between(ride.getStartedAt(), ride.getCompletedAt());
            if (actualMinutes < 1) actualMinutes = 1;
            ride.setDurationMinutes((double) actualMinutes);
        }

        // Calculate final fare
        double finalFare = fareCalculatorService.calculateFinalFare(
                ride.getDistanceKm(), ride.getDurationMinutes()
        );
        ride.setFare(finalFare);
        ride = rideRepository.save(ride);

        // Make driver available again
        DriverProfile driverProfile = driverProfileRepository.findByUserId(driverId)
                .orElseThrow(() -> new RuntimeException("Driver profile not found"));
        driverProfile.setIsAvailable(true);
        driverProfile.setTotalRides(driverProfile.getTotalRides() + 1);
        driverProfileRepository.save(driverProfile);

        // Deduct from rider wallet
        User rider = ride.getRider();
        rider.setWalletBalance(rider.getWalletBalance() - finalFare);
        userRepository.save(rider);

        RideResponse response = toRideResponse(ride);

        // Notify rider
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "RIDE_COMPLETED");
        notification.put("ride", response);
        messagingTemplate.convertAndSend("/topic/ride/" + rideId, notification);

        return response;
    }

    /**
     * Cancel a ride.
     */
    @Transactional
    public RideResponse cancelRide(Long userId, Long rideId) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getRider().getId().equals(userId) &&
            (ride.getDriver() == null || !ride.getDriver().getId().equals(userId))) {
            throw new RuntimeException("Unauthorized");
        }

        ride.setStatus(RideStatus.CANCELLED);
        ride = rideRepository.save(ride);

        // Free up driver if assigned
        if (ride.getDriver() != null) {
            DriverProfile dp = driverProfileRepository.findByUserId(ride.getDriver().getId()).orElse(null);
            if (dp != null) {
                dp.setIsAvailable(true);
                driverProfileRepository.save(dp);
            }
        }

        RideResponse response = toRideResponse(ride);

        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "RIDE_CANCELLED");
        notification.put("ride", response);
        messagingTemplate.convertAndSend("/topic/ride/" + rideId, notification);

        return response;
    }

    /**
     * Rate the driver after ride completion.
     */
    @Transactional
    public RideResponse rateDriver(Long riderId, Long rideId, int rating) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));

        if (!ride.getRider().getId().equals(riderId)) {
            throw new RuntimeException("Unauthorized");
        }

        if (ride.getStatus() != RideStatus.COMPLETED) {
            throw new RuntimeException("Can only rate completed rides");
        }

        ride.setDriverRating(rating);
        ride = rideRepository.save(ride);

        // Update driver's average rating
        if (ride.getDriver() != null) {
            DriverProfile dp = driverProfileRepository.findByUserId(ride.getDriver().getId()).orElse(null);
            if (dp != null) {
                dp.setTotalRatingSum(dp.getTotalRatingSum() + rating);
                dp.setRating(dp.getTotalRatingSum() / dp.getTotalRides());
                driverProfileRepository.save(dp);
            }
        }

        return toRideResponse(ride);
    }

    /**
     * Get ride by ID.
     */
    public RideResponse getRide(Long rideId) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found"));
        RideResponse response = toRideResponse(ride);

        // Add current driver location if ride is active
        if (ride.getDriver() != null && ride.getStatus() != RideStatus.COMPLETED
                && ride.getStatus() != RideStatus.CANCELLED) {
            DriverProfile dp = driverProfileRepository.findByUserId(ride.getDriver().getId()).orElse(null);
            if (dp != null) {
                response.setDriverLat(dp.getLatitude());
                response.setDriverLng(dp.getLongitude());
            }
        }

        return response;
    }

    /**
     * Get active ride for a user (rider or driver).
     */
    public RideResponse getActiveRide(Long userId, String role) {
        List<Ride> activeRides;
        if ("RIDER".equals(role)) {
            activeRides = rideRepository.findActiveRidesForRider(userId);
        } else {
            activeRides = rideRepository.findActiveRidesForDriver(userId);
        }

        if (activeRides.isEmpty()) return null;

        Ride ride = activeRides.get(0);
        RideResponse response = toRideResponse(ride);

        if (ride.getDriver() != null) {
            DriverProfile dp = driverProfileRepository.findByUserId(ride.getDriver().getId()).orElse(null);
            if (dp != null) {
                response.setDriverLat(dp.getLatitude());
                response.setDriverLng(dp.getLongitude());
            }
        }

        return response;
    }

    /**
     * Get ride history for a user.
     */
    public List<RideResponse> getRideHistory(Long userId, String role) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<Ride> rides;
        if ("RIDER".equals(role)) {
            rides = rideRepository.findByRiderOrderByCreatedAtDesc(user);
        } else {
            rides = rideRepository.findByDriverOrderByCreatedAtDesc(user);
        }

        return rides.stream().map(this::toRideResponse).toList();
    }

    /**
     * Get pending ride requests for drivers (REQUESTED status).
     */
    public List<RideResponse> getPendingRequests() {
        List<RideStatus> statuses = List.of(RideStatus.REQUESTED);
        List<Ride> rides = rideRepository.findAll().stream()
                .filter(r -> r.getStatus() == RideStatus.REQUESTED)
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .toList();
        return rides.stream().map(this::toRideResponse).toList();
    }

    private RideResponse toRideResponse(Ride ride) {
        RideResponse.RideResponseBuilder builder = RideResponse.builder()
                .id(ride.getId())
                .riderId(ride.getRider().getId())
                .riderName(ride.getRider().getName())
                .pickupLat(ride.getPickupLat())
                .pickupLng(ride.getPickupLng())
                .pickupAddress(ride.getPickupAddress())
                .dropLat(ride.getDropLat())
                .dropLng(ride.getDropLng())
                .dropAddress(ride.getDropAddress())
                .status(ride.getStatus())
                .fare(ride.getFare())
                .estimatedFare(ride.getEstimatedFare())
                .distanceKm(ride.getDistanceKm())
                .durationMinutes(ride.getDurationMinutes())
                .rating(ride.getDriverRating())
                .createdAt(ride.getCreatedAt())
                .acceptedAt(ride.getAcceptedAt())
                .startedAt(ride.getStartedAt())
                .completedAt(ride.getCompletedAt());

        if (ride.getDriver() != null) {
            builder.driverId(ride.getDriver().getId())
                   .driverName(ride.getDriver().getName())
                   .driverPhone(ride.getDriver().getPhone());

            DriverProfile dp = driverProfileRepository.findByUser(ride.getDriver()).orElse(null);
            if (dp != null) {
                builder.vehicleNumber(dp.getVehicleNumber())
                       .vehicleType(dp.getVehicleType())
                       .driverRating(dp.getRating());
            }
        }

        return builder.build();
    }
}
