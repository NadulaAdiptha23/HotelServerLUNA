package com.codeWithProject.HotelServer.configs;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Enables @Async so email sending (EmailService) runs on a background
 * thread and never delays the reservation/payment API response back
 * to the guest.
 */
@Configuration
@EnableAsync
public class AsyncConfig {
}
