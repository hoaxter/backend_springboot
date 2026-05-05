package com.ridebook.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "drivers")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class DriverProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private Double latitude;
    private Double longitude;

    @Column(name = "is_online")
    private Boolean isOnline = false;

    @Column(name = "is_available")
    private Boolean isAvailable = true;

    @Column(name = "vehicle_number")
    private String vehicleNumber;

    @Column(name = "vehicle_type")
    private String vehicleType = "Sedan";

    private Double rating = 5.0;

    @Column(name = "total_rides")
    private Integer totalRides = 0;

    @Column(name = "total_rating_sum")
    private Double totalRatingSum = 0.0;
}
