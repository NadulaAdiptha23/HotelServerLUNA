package com.codeWithProject.HotelServer.repository;

import com.codeWithProject.HotelServer.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    boolean existsByReservationId(Long reservationId);

    List<Feedback> findByReservation_Table_Id(Long tableId);

    @Query("SELECT AVG(f.rating) FROM Feedback f WHERE f.reservation.table.id = :tableId")
    Double getAverageRatingByTableId(Long tableId);

    void deleteByReservationId(Long reservationId);
}
