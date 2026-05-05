package com.ridebook.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class RideRequest {
    private Double pickupLat;
    private Double pickupLng;
    private String pickupAddress;
    private Double dropLat;
    private Double dropLng;
    private String dropAddress;
}
