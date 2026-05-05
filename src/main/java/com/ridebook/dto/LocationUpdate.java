package com.ridebook.dto;

import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class LocationUpdate {
    private Double latitude;
    private Double longitude;
    private Long rideId;
}
