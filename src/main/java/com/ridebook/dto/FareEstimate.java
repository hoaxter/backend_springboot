package com.ridebook.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class FareEstimate {
    private Double distanceKm;
    private Double durationMinutes;
    private Double estimatedFare;
    private Double baseFare;
    private Double distanceCharge;
    private Double timeCharge;
    private Double surgeMultiplier;
}
