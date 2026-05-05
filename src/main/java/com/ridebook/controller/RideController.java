package com.ridebook.controller;

import com.ridebook.dto.*;
import com.ridebook.service.RideService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ride")
public class RideController {

    private final RideService rideService;

    public RideController(RideService rideService) {
        this.rideService = rideService;
    }

    /**
     * Get fare estimate before booking.
     */
    @PostMapping("/fare-estimate")
    public ResponseEntity<FareEstimate> getFareEstimate(@RequestBody RideRequest request) {
        FareEstimate estimate = rideService.getFareEstimate(
                request.getPickupLat(), request.getPickupLng(),
                request.getDropLat(), request.getDropLng()
        );
        return ResponseEntity.ok(estimate);
    }

    /**
     * Request a new ride.
     */
    @PostMapping("/request")
    public ResponseEntity<?> requestRide(@RequestBody RideRequest request,
                                         Authentication auth) {
        try {
            Long userId = (Long) auth.getCredentials();
            RideResponse response = rideService.requestRide(userId, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get ride details.
     */
    @GetMapping("/{id}")
    public ResponseEntity<RideResponse> getRide(@PathVariable Long id) {
        return ResponseEntity.ok(rideService.getRide(id));
    }

    /**
     * Get active ride for current user.
     */
    @GetMapping("/active")
    public ResponseEntity<?> getActiveRide(Authentication auth) {
        Long userId = (Long) auth.getCredentials();
        String role = auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        RideResponse ride = rideService.getActiveRide(userId, role);
        if (ride == null) {
            return ResponseEntity.ok(Map.of("active", false));
        }
        return ResponseEntity.ok(ride);
    }

    /**
     * Cancel a ride.
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<RideResponse> cancelRide(@PathVariable Long id, Authentication auth) {
        Long userId = (Long) auth.getCredentials();
        return ResponseEntity.ok(rideService.cancelRide(userId, id));
    }

    /**
     * Rate the driver.
     */
    @PostMapping("/{id}/rate")
    public ResponseEntity<RideResponse> rateDriver(@PathVariable Long id,
                                                    @RequestBody Map<String, Integer> body,
                                                    Authentication auth) {
        Long userId = (Long) auth.getCredentials();
        return ResponseEntity.ok(rideService.rateDriver(userId, id, body.get("rating")));
    }

    /**
     * Get ride history for current user.
     */
    @GetMapping("/history")
    public ResponseEntity<List<RideResponse>> getRideHistory(Authentication auth) {
        Long userId = (Long) auth.getCredentials();
        String role = auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
        return ResponseEntity.ok(rideService.getRideHistory(userId, role));
    }
}
