package com.ridebook.repository;

import com.ridebook.model.DriverProfile;
import com.ridebook.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface DriverProfileRepository extends JpaRepository<DriverProfile, Long> {

    Optional<DriverProfile> findByUser(User user);

    Optional<DriverProfile> findByUserId(Long userId);

    @Query("SELECT d FROM DriverProfile d WHERE d.isOnline = true AND d.isAvailable = true")
    List<DriverProfile> findAllOnlineAvailable();

    @Query("SELECT d FROM DriverProfile d WHERE d.isOnline = true AND d.isAvailable = true " +
           "AND d.latitude IS NOT NULL AND d.longitude IS NOT NULL")
    List<DriverProfile> findAllOnlineAvailableWithLocation();

    @Query("SELECT d FROM DriverProfile d WHERE d.isOnline = true " +
           "AND d.latitude IS NOT NULL AND d.longitude IS NOT NULL")
    List<DriverProfile> findAllOnlineWithLocation();
}
