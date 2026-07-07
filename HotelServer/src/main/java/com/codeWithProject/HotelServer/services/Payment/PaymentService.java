package com.codeWithProject.HotelServer.services.Payment;

import com.codeWithProject.HotelServer.entity.Payment;
import com.codeWithProject.HotelServer.entity.Reservation;
import com.codeWithProject.HotelServer.entity.User;
import com.codeWithProject.HotelServer.enums.UserRole;
import com.codeWithProject.HotelServer.repository.PaymentRepository;
import com.codeWithProject.HotelServer.repository.ReservationRepository;
import com.codeWithProject.HotelServer.repository.UserRepository;
import com.codeWithProject.HotelServer.services.Email.EmailService;
import com.codeWithProject.HotelServer.utill.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private EmailService emailService;

    public Payment createPayment(Payment payment) {
        if (payment == null || payment.getReservation() == null || payment.getReservation().getId() == null) {
            throw new IllegalArgumentException("Reservation id is required");
        }

        Long reservationId = payment.getReservation().getId();
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Reservation not found"));

        // Ignore client-sent payment id for POST create to avoid stale update/optimistic lock failures.
        Payment target = paymentRepository.findByReservationId(reservationId)
                .orElseGet(Payment::new);

        double tableAmount = reservation.getTable() != null ? reservation.getTable().getPrice() : payment.getTableAmount();
        double menuSubtotal = Math.max(0, payment.getMenuSubtotal());
        double finalAmount = menuSubtotal > 0 || payment.getOrderItemsJson() != null
                ? tableAmount + menuSubtotal
                : payment.getAmount();

        target.setAmount(finalAmount);
        target.setMenuSubtotal(menuSubtotal);
        target.setTableAmount(tableAmount);
        target.setMethod(payment.getMethod());
        target.setStatus(payment.getStatus());
        target.setOrderItemsJson(payment.getOrderItemsJson());
        target.setReservationSnapshot(buildReservationSnapshot(reservation));
        target.setReservation(reservation);

        Payment saved = paymentRepository.save(target);

        // Fire-and-forget receipt email — never blocks or fails the payment itself.
        emailService.sendPaymentConfirmation(saved);

        return saved;
    }

    public List<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }

    public void deletePayment(Long id, String authorizationHeader) {
        User currentUser = getCurrentUser(authorizationHeader);

        if (currentUser.getResolvedUserRole() != UserRole.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admin can delete payments");
        }

        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));

        paymentRepository.delete(payment);
    }

    private User getCurrentUser(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Login is required");
        }

        String token = authorizationHeader.substring(7);
        String email;

        try {
            email = jwtUtil.extractUsername(token);
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid login session");
        }

        return userRepository.findFirstByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private String buildReservationSnapshot(Reservation reservation) {
        var table = reservation.getTable();

        return "{"
                + "\"reservationId\":" + reservation.getId() + ","
                + "\"customerName\":\"" + jsonEscape(reservation.getCustomerName()) + "\","
                + "\"date\":\"" + jsonEscape(reservation.getDate()) + "\","
                + "\"time\":\"" + jsonEscape(reservation.getTime()) + "\","
                + "\"checkoutTime\":\"" + jsonEscape(reservation.getCtime()) + "\","
                + "\"tableId\":" + (table != null ? table.getId() : null) + ","
                + "\"tableNumber\":" + (table != null ? table.getTableNumber() : null) + ","
                + "\"tablePrice\":" + (table != null ? table.getPrice() : 0)
                + "}";
    }

    private String jsonEscape(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
