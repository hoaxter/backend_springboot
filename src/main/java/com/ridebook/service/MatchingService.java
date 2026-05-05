package com.ridebook.service;

import com.ridebook.dto.DriverInfo;
import com.ridebook.model.DriverProfile;
import com.ridebook.repository.DriverProfileRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MatchingService {

    private final DriverProfileRepository driverProfileRepository;
    private final GeoLocationService geoLocationService;

    @Value("${app.ride.search-radius-km}")
    private double searchRadiusKm;

    public MatchingService(DriverProfileRepository driverProfileRepository,
                          GeoLocationService geoLocationService) {
        this.driverProfileRepository = driverProfileRepository;
        this.geoLocationService = geoLocationService;
    }

    /**
     * Find the nearest available drivers within the search radius.
     * 
     * Algorithm:
     * 1. Query all online + available drivers with known locations
     * 2. Calculate Haversine distance from pickup to each driver
     * 3. Filter drivers within the configured search radius
     * 4. Sort by distance ascending (nearest first)
     * 5. Return the sorted list for cascading assignment
     */
    public List<DriverInfo> findNearestDrivers(double pickupLat, double pickupLng) {
        List<DriverProfile> onlineDrivers = driverProfileRepository.findAllOnlineAvailableWithLocation();

        return onlineDrivers.stream()
                .map(driver -> {
                    double distance = geoLocationService.calculateDistance(
                            pickupLat, pickupLng,
                            driver.getLatitude(), driver.getLongitude()
                    );
                    return DriverInfo.builder()
                            .driverId(driver.getId())
                            .userId(driver.getUser().getId())
                            .name(driver.getUser().getName())
                            .phone(driver.getUser().getPhone())
                            .latitude(driver.getLatitude())
                            .longitude(driver.getLongitude())
                            .isOnline(driver.getIsOnline())
                            .isAvailable(driver.getIsAvailable())
                            .vehicleNumber(driver.getVehicleNumber())
                            .vehicleType(driver.getVehicleType())
                            .rating(driver.getRating())
                            .distanceKm(Math.round(distance * 100.0) / 100.0)
                            .build();
                })
                .filter(info -> info.getDistanceKm() <= searchRadiusKm)
                .sorted(Comparator.comparingDouble(DriverInfo::getDistanceKm))
                .collect(Collectors.toList());
    }

    /**
     * Get the single nearest available driver.
     */
    public DriverInfo findNearestDriver(double pickupLat, double pickupLng) {
        List<DriverInfo> drivers = findNearestDrivers(pickupLat, pickupLng);
        return drivers.isEmpty() ? null : drivers.get(0);
    }
}
