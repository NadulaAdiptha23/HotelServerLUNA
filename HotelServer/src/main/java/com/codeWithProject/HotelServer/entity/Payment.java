package com.codeWithProject.HotelServer.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private double amount;
    private double menuSubtotal;
    private double tableAmount;
    private String method; // CASH / CARD
    private String status; // PAID / PENDING

    @Column(columnDefinition = "TEXT")
    private String orderItemsJson;

    @Column(columnDefinition = "TEXT")
    private String reservationSnapshot;

    @OneToOne
    @JoinColumn(name = "reservation_id")
    private Reservation reservation;

//    // 🔹 Constructor
//    public Payment() {
//    }
//
//    // 🔹 Getters & Setters
//
//    public Long getId() {
//        return id;
//    }
//
//    public double getAmount() {
//        return amount;
//    }
//
//    public void setAmount(double amount) {
//        this.amount = amount;
//    }
//
//    public String getMethod() {
//        return method;
//    }
//
//    public void setMethod(String method) {
//        this.method = method;
//    }
//
//    public String getStatus() {
//        return status;
//    }
//
//    public void setStatus(String status) {
//        this.status = status;
//    }
//
//    public Reservation getReservation() {
//        return reservation;
//    }
//
//    public void setReservation(Reservation reservation) {
//        this.reservation = reservation;
//    }
}
