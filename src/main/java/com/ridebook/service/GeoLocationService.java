package com.ridebook.service;

import org.springframework.stereotype.Service;

@Service
public class GeoLocationService {

    private static final double EARTH_RADIUS_KM = 6371.0;

    /**
     * Calculate the Haversine distance between two geographic coordinates.
     * Returns distance in kilometers.
     */
    public double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                 + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                 * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_KM * c;
    }

    /**
     * Estimate travel duration based on distance.
     * Assumes average city driving speed of ~25 km/h.
     */
    public double estimateDuration(double distanceKm) {
        double avgSpeedKmh = 25.0;
        return (distanceKm / avgSpeedKmh) * 60; // Return in minutes
    }

    /**
     * Interpolate a position between two points given a fraction (0.0 to 1.0).
     */
    public double[] interpolate(double lat1, double lon1, double lat2, double lon2, double fraction) {
        double lat = lat1 + (lat2 - lat1) * fraction;
        double lon = lon1 + (lon2 - lon1) * fraction;
        return new double[]{lat, lon};
    }
}
