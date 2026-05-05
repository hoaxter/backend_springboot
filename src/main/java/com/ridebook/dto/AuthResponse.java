package com.ridebook.dto;

import com.ridebook.model.UserRole;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AuthResponse {
    private String token;
    private Long userId;
    private String name;
    private String email;
    private UserRole role;
    private Double walletBalance;
}
