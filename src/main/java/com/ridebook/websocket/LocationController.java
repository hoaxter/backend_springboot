package com.ridebook.websocket;

import com.ridebook.dto.LocationUpdate;
import com.ridebook.model.DriverProfile;
import com.ridebook.repository.DriverProfileRepository;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.HashMap;
import java.util.Map;

@Controller
public class LocationController {

    private final DriverProfileRepository driverProfileRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public LocationController(DriverProfileRepository driverProfileRepository,
                            SimpMessagingTemplate messagingTemplate) {
        this.driverProfileRepository = driverProfileRepository;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Handle incoming driver location updates via WebSocket.
     * Driver sends to: /app/driver/location
     * Server broadcasts to: /topic/ride/{rideId}
     */
    @MessageMapping("/driver/location")
    public void updateDriverLocation(@Payload LocationUpdate update) {
        // Update driver's location in database
        if (update.getLatitude() != null && update.getLongitude() != null) {
            // Find driver profile by iterating (in production, pass driverId)
            // For now, if rideId is provided, broadcast location
            if (update.getRideId() != null) {
                Map<String, Object> locationMsg = new HashMap<>();
                locationMsg.put("type", "DRIVER_LOCATION");
                locationMsg.put("latitude", update.getLatitude());
                locationMsg.put("longitude", update.getLongitude());
                locationMsg.put("rideId", update.getRideId());

                messagingTemplate.convertAndSend(
                        "/topic/ride/" + update.getRideId(),
                        locationMsg
                );
            }
        }
    }
}
