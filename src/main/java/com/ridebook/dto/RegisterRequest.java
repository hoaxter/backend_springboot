package com.ridebook.dto;

import com.ridebook.model.UserRole;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class RegisterRequest {
    private String name;
    private String email;
    private String password;
    private String phone;
    private UserRole role;
    private String vehicleNumber;
    private String vehicleType;
}
