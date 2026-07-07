package com.codeWithProject.HotelServer.controller.auth;

import com.codeWithProject.HotelServer.entity.Payment;
import com.codeWithProject.HotelServer.services.Payment.PaymentService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    // CREATE
    @PostMapping
    public Payment createPayment(@RequestBody Payment payment) {
        return paymentService.createPayment(payment);
    }

    // GET ALL
    @GetMapping
    public List<Payment> getAllPayments() {
        return paymentService.getAllPayments();
    }

    // DELETE
    @DeleteMapping("/{id}")
    public void deletePayment(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        paymentService.deletePayment(id, authorizationHeader);
    }
}
