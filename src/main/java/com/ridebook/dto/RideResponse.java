package com.ridebook.dto;

import com.ridebook.model.RideStatus;
import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class RideResponse {
    private Long id;
    private Long riderId;
    private String riderName;
    private Long driverId;
    private String driverName;
    private String driverPhone;
    private String vehicleNumber;
    private String vehicleType;
    private Double driverRating;
    private Double pickupLat;
    private Double pickupLng;
    private String pickupAddress;
    private Double dropLat;
    private Double dropLng;
    private String dropAddress;
    private RideStatus status;
    private Double fare;
    private Double estimatedFare;
    private Double distanceKm;
    private Double durationMinutes;
    private Integer rating;
    private LocalDateTime createdAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private Double driverLat;
    private Double driverLng;
}
