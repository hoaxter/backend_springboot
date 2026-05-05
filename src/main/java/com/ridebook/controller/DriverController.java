package com.ridebook.controller;

import com.ridebook.dto.*;
import com.ridebook.model.DriverProfile;
import com.ridebook.model.User;
import com.ridebook.repository.DriverProfileRepository;
import com.ridebook.repository.UserRepository;
import com.ridebook.service.RideService;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/driver")
public class DriverController {

    private final DriverProfileRepository driverProfileRepository;
    private final UserRepository userRepository;
    private final RideService rideService;
    private final SimpMessagingTemplate messagingTemplate;

    public DriverController(DriverProfileRepository driverProfileRepository,
                           UserRepository userRepository,
                           RideService rideService,
                           SimpMessagingTemplate messagingTemplate) {
        this.driverProfileRepository = driverProfileRepository;
        this.userRepository = userRepository;
        this.rideService = rideService;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Toggle driver online/offline status.
     */
    @PostMapping("/toggle-online")
    public ResponseEntity<?> toggleOnline(Authentication auth) {
        Long userId = (Long) auth.getCredentials();
        DriverProfile profile = driverProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Driver profile not found"));

        profile.setIsOnline(!profile.getIsOnline());
        if (!profile.getIsOnline()) {
            profile.setIsAvailable(false);
        } else {
            profile.setIsAvailable(true);
        }
        driverProfileRepository.save(profile);

        Map<String, Object> response = new HashMap<>();
        response.put("isOnline", profile.getIsOnline());
        response.put("isAvailable", profile.getIsAvailable());
        return ResponseEntity.ok(response);
    }

    /**
     * Update driver location.
     */
    @PostMapping("/update-location")
    public ResponseEntity<?> updateLocation(@RequestBody LocationUpdate update,
                                            Authentication auth) {
        Long userId = (Long) auth.getCredentials();
        DriverProfile profile = driverProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Driver profile not found"));

        profile.setLatitude(update.getLatitude());
        profile.setLongitude(update.getLongitude());
        driverProfileRepository.save(profile);

        // If there's an active ride, broadcast location
        if (update.getRideId() != null) {
            Map<String, Object> locationMsg = new HashMap<>();
            locationMsg.put("type", "DRIVER_LOCATION");
            locationMsg.put("latitude", update.getLatitude());
            locationMsg.put("longitude", update.getLongitude());
            locationMsg.put("rideId", update.getRideId());
            messagingTemplate.convertAndSend("/topic/ride/" + update.getRideId(), locationMsg);
        }

        return ResponseEntity.ok(Map.of("status", "Location updated"));
    }

    /**
     * Accept a ride request.
     */
    @PostMapping("/ride/{id}/accept")
    public ResponseEntity<?> acceptRide(@PathVariable Long id, Authentication auth) {
        try {
            Long userId = (Long) auth.getCredentials();
            RideResponse response = rideService.acceptRide(userId, id);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Reject a ride request.
     */
    @PostMapping("/ride/{id}/reject")
    public ResponseEntity<?> rejectRide(@PathVariable Long id, Authentication auth) {
        Long userId = (Long) auth.getCredentials();
        rideService.rejectRide(userId, id);
        return ResponseEntity.ok(Map.of("status", "Ride rejected"));
    }

    /**
     * Start a trip.
     */
    @PostMapping("/ride/{id}/start")
    public ResponseEntity<RideResponse> startRide(@PathVariable Long id, Authentication auth) {
        Long userId = (Long) auth.getCredentials();
        return ResponseEntity.ok(rideService.startRide(userId, id));
    }

    /**
     * Complete a trip.
     */
    @PostMapping("/ride/{id}/complete")
    public ResponseEntity<RideResponse> completeRide(@PathVariable Long id, Authentication auth) {
        Long userId = (Long) auth.getCredentials();
        return ResponseEntity.ok(rideService.completeRide(userId, id));
    }

    /**
     * Get driver profile / status.
     */
    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(Authentication auth) {
        Long userId = (Long) auth.getCredentials();
        DriverProfile profile = driverProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Driver profile not found"));

        User user = profile.getUser();
        Map<String, Object> response = new HashMap<>();
        response.put("driverId", profile.getId());
        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("phone", user.getPhone());
        response.put("isOnline", profile.getIsOnline());
        response.put("isAvailable", profile.getIsAvailable());
        response.put("vehicleNumber", profile.getVehicleNumber());
        response.put("vehicleType", profile.getVehicleType());
        response.put("rating", profile.getRating());
        response.put("totalRides", profile.getTotalRides());
        response.put("latitude", profile.getLatitude());
        response.put("longitude", profile.getLongitude());
        response.put("walletBalance", user.getWalletBalance());

        return ResponseEntity.ok(response);
    }

    /**
     * Get pending ride requests.
     */
    @GetMapping("/ride-requests")
    public ResponseEntity<List<RideResponse>> getRideRequests() {
        return ResponseEntity.ok(rideService.getPendingRequests());
    }

    /**
     * Get all online drivers (for map display).
     */
    @GetMapping("/online")
    public ResponseEntity<?> getOnlineDrivers() {
        List<DriverProfile> drivers = driverProfileRepository.findAllOnlineWithLocation();
        List<Map<String, Object>> result = new ArrayList<>();
        for (DriverProfile dp : drivers) {
            Map<String, Object> d = new HashMap<>();
            d.put("driverId", dp.getId());
            d.put("name", dp.getUser().getName());
            d.put("latitude", dp.getLatitude());
            d.put("longitude", dp.getLongitude());
            d.put("vehicleType", dp.getVehicleType());
            d.put("isAvailable", dp.getIsAvailable());
            d.put("rating", dp.getRating());
            result.add(d);
        }
        return ResponseEntity.ok(result);
    }
}
