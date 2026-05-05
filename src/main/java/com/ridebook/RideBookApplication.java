package com.ridebook;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RideBookApplication {

    public static void main(String[] args) {
        SpringApplication.run(RideBookApplication.class, args);
    }
}
