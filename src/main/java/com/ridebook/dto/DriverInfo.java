package com.ridebook.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DriverInfo {
    private Long driverId;
    private Long userId;
    private String name;
    private String phone;
    private Double latitude;
    private Double longitude;
    private Boolean isOnline;
    private Boolean isAvailable;
    private String vehicleNumber;
    private String vehicleType;
    private Double rating;
    private Double distanceKm;
}
