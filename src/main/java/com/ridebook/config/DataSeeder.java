package com.ridebook.config;

import com.ridebook.model.*;
import com.ridebook.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner seedData(UserRepository userRepository,
                              DriverProfileRepository driverProfileRepository,
                              PasswordEncoder passwordEncoder) {
        return args -> {
            // Only seed if no users exist
            if (userRepository.count() > 0) return;

            // Create demo rider
            User rider = User.builder()
                    .name("Nitin Rider")
                    .email("rider@demo.com")
                    .password(passwordEncoder.encode("password"))
                    .phone("9876543210")
                    .role(UserRole.RIDER)
                    .walletBalance(5000.0)
                    .build();
            userRepository.save(rider);

            // Create demo drivers around Bangalore (MG Road area)
            String[][] drivers = {
                {"Rajesh Kumar", "driver1@demo.com", "9876500001", "KA01AB1234", "Sedan", "12.9750", "77.6090"},
                {"Suresh Patil", "driver2@demo.com", "9876500002", "KA01CD5678", "SUV", "12.9680", "77.5950"},
                {"Anil Sharma", "driver3@demo.com", "9876500003", "KA01EF9012", "Hatchback", "12.9820", "77.6150"},
                {"Priya Singh", "driver4@demo.com", "9876500004", "KA01GH3456", "Sedan", "12.9600", "77.5880"},
                {"Manoj Reddy", "driver5@demo.com", "9876500005", "KA01IJ7890", "SUV", "12.9900", "77.6200"}
            };

            for (String[] d : drivers) {
                User driverUser = User.builder()
                        .name(d[0])
                        .email(d[1])
                        .password(passwordEncoder.encode("password"))
                        .phone(d[2])
                        .role(UserRole.DRIVER)
                        .walletBalance(2000.0)
                        .build();
                driverUser = userRepository.save(driverUser);

                DriverProfile profile = DriverProfile.builder()
                        .user(driverUser)
                        .vehicleNumber(d[3])
                        .vehicleType(d[4])
                        .latitude(Double.parseDouble(d[5]))
                        .longitude(Double.parseDouble(d[6]))
                        .isOnline(true)
                        .isAvailable(true)
                        .rating(4.5 + Math.random() * 0.5)
                        .totalRides((int)(Math.random() * 100) + 10)
                        .totalRatingSum(0.0)
                        .build();
                driverProfileRepository.save(profile);
            }

            System.out.println("✅ Demo data seeded: 1 rider + 5 drivers (Bangalore area)");
            System.out.println("   Rider: rider@demo.com / password");
            System.out.println("   Driver: driver1@demo.com / password");
        };
    }
}
