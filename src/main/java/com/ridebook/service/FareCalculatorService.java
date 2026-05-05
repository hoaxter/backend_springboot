package com.ridebook.service;

import com.ridebook.dto.FareEstimate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class FareCalculatorService {

    @Value("${app.ride.base-fare}")
    private double baseFare;

    @Value("${app.ride.per-km-rate}")
    private double perKmRate;

    @Value("${app.ride.per-min-rate}")
    private double perMinRate;

    @Value("${app.ride.surge-multiplier}")
    private double surgeMultiplier;

    /**
     * Calculate fare estimate based on distance and estimated duration.
     */
    public FareEstimate calculateFare(double distanceKm, double durationMinutes) {
        double distanceCharge = distanceKm * perKmRate;
        double timeCharge = durationMinutes * perMinRate;
        double totalFare = (baseFare + distanceCharge + timeCharge) * surgeMultiplier;

        // Round to 2 decimal places
        totalFare = Math.round(totalFare * 100.0) / 100.0;

        return FareEstimate.builder()
                .distanceKm(Math.round(distanceKm * 100.0) / 100.0)
                .durationMinutes(Math.round(durationMinutes * 100.0) / 100.0)
                .estimatedFare(totalFare)
                .baseFare(baseFare)
                .distanceCharge(Math.round(distanceCharge * 100.0) / 100.0)
                .timeCharge(Math.round(timeCharge * 100.0) / 100.0)
                .surgeMultiplier(surgeMultiplier)
                .build();
    }

    /**
     * Calculate final fare (can incorporate actual trip duration).
     */
    public double calculateFinalFare(double distanceKm, double durationMinutes) {
        double distanceCharge = distanceKm * perKmRate;
        double timeCharge = durationMinutes * perMinRate;
        double totalFare = (baseFare + distanceCharge + timeCharge) * surgeMultiplier;
        return Math.round(totalFare * 100.0) / 100.0;
    }
}
