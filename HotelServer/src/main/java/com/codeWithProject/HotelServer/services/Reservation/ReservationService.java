package com.codeWithProject.HotelServer.services.Reservation;

import com.codeWithProject.HotelServer.entity.Reservation;
import com.codeWithProject.HotelServer.entity.Table;
import com.codeWithProject.HotelServer.repository.FeedbackRepository;
import com.codeWithProject.HotelServer.repository.PaymentRepository;
import com.codeWithProject.HotelServer.repository.ReservationRepository;
import com.codeWithProject.HotelServer.repository.TableRepository;
import com.codeWithProject.HotelServer.services.Email.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ReservationService {

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private TableRepository tableRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private EmailService emailService;

    // CREATE BOOKING
    public Reservation createReservation(Reservation reservation) {

        Long tableId = reservation.getTable().getId();

        Table table = tableRepository.findById(tableId).orElse(null);

        if (table == null) {
            throw new RuntimeException("Table not found");
        }

        if (!table.isAvailable()) {
            throw new RuntimeException("Table already booked");
        }

        // mark as booked
        table.setAvailable(false);
        tableRepository.save(table);

        reservation.setTable(table);

        Reservation saved = reservationRepository.save(reservation);

        // Fire-and-forget confirmation email — never blocks or fails the booking itself.
        emailService.sendReservationConfirmation(saved);

        return saved;
    }

    // GET ALL
    public List<Reservation> getAllReservations() {
        return reservationRepository.findAll();
    }

    // DELETE (Cancel Booking)
    @Transactional
    public void deleteReservation(Long id) {

        Reservation reservation = reservationRepository.findById(id).orElse(null);

        if (reservation != null) {
            Table table = reservation.getTable();

            // Remove dependent rows first to avoid foreign key errors on delete.
            feedbackRepository.deleteByReservationId(id);
            paymentRepository.deleteByReservationId(id);

            if (table != null) {
                // make table available again
                table.setAvailable(true);
                tableRepository.save(table);
            }

            reservationRepository.deleteById(id);
        }
    }
}
