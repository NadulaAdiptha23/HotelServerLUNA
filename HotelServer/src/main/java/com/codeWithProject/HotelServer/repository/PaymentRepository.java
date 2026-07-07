package com.codeWithProject.HotelServer.repository;

import com.codeWithProject.HotelServer.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByReservationId(Long reservationId);

    void deleteByReservationId(Long reservationId);
}
