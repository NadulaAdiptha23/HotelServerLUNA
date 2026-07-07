package com.codeWithProject.HotelServer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.codeWithProject.HotelServer")
public class HotelServerApplication {

	public static void main(String[] args) {
		SpringApplication.run(HotelServerApplication.class, args);
	}

}
