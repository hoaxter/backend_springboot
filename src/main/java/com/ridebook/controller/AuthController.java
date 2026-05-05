package com.ridebook.controller;

import com.ridebook.dto.*;
import com.ridebook.model.*;
import com.ridebook.repository.*;
import com.ridebook.security.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserRepository userRepository;
    private final DriverProfileRepository driverProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(UserRepository userRepository,
                         DriverProfileRepository driverProfileRepository,
                         PasswordEncoder passwordEncoder,
                         JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.driverProfileRepository = driverProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(request.getRole())
                .walletBalance(1000.0)
                .build();
        user = userRepository.save(user);

        // If driver, create driver profile
        if (request.getRole() == UserRole.DRIVER) {
            DriverProfile profile = DriverProfile.builder()
                    .user(user)
                    .vehicleNumber(request.getVehicleNumber())
                    .vehicleType(request.getVehicleType() != null ? request.getVehicleType() : "Sedan")
                    .isOnline(false)
                    .isAvailable(true)
                    .rating(5.0)
                    .totalRides(0)
                    .totalRatingSum(0.0)
                    .build();
            driverProfileRepository.save(profile);
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getId(), user.getRole().name());

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .walletBalance(user.getWalletBalance())
                .build());
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElse(null);

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid email or password"));
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getId(), user.getRole().name());

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .walletBalance(user.getWalletBalance())
                .build());
    }
}
