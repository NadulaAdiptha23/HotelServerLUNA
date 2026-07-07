package com.codeWithProject.HotelServer.repository;

import com.codeWithProject.HotelServer.entity.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
}
