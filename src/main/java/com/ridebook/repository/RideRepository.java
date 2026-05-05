package com.ridebook.repository;

import com.ridebook.model.Ride;
import com.ridebook.model.RideStatus;
import com.ridebook.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface RideRepository extends JpaRepository<Ride, Long> {

    List<Ride> findByRiderOrderByCreatedAtDesc(User rider);

    List<Ride> findByDriverOrderByCreatedAtDesc(User driver);

    List<Ride> findByRiderAndStatusIn(User rider, List<RideStatus> statuses);

    List<Ride> findByDriverAndStatusIn(User driver, List<RideStatus> statuses);

    @Query("SELECT r FROM Ride r WHERE r.rider.id = :riderId AND r.status IN ('REQUESTED','ACCEPTED','DRIVER_ARRIVING','STARTED') ORDER BY r.createdAt DESC")
    List<Ride> findActiveRidesForRider(Long riderId);

    @Query("SELECT r FROM Ride r WHERE r.driver.id = :driverId AND r.status IN ('ACCEPTED','DRIVER_ARRIVING','STARTED') ORDER BY r.createdAt DESC")
    List<Ride> findActiveRidesForDriver(Long driverId);
}
