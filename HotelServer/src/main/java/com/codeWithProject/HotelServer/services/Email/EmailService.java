package com.codeWithProject.HotelServer.services.Email;

import com.codeWithProject.HotelServer.entity.Payment;
import com.codeWithProject.HotelServer.entity.Reservation;
import com.codeWithProject.HotelServer.entity.Table;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

/**
 * Sends guest-facing confirmation emails for reservations and payments.
 *
 * All methods are @Async and internally swallow/log any mail-server error
 * so a flaky or unconfigured SMTP connection can NEVER break a booking or
 * payment for the guest — the email is a nice-to-have, not a dependency
 * of the core flow.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromAddress;

    @Value("${luna.mail.enabled:true}")
    private boolean mailEnabled;

    private static final String GOLD = "#c8a45e";
    private static final String INK = "#1a1814";

    @Async
    public void sendReservationConfirmation(Reservation reservation) {
        if (!canSend(reservation != null ? reservation.getEmail() : null)) return;

        try {
            Table table = reservation.getTable();
            String body = wrapTemplate(
                    "Reservation Confirmed",
                    "We're delighted to confirm your table at Luna Cove.",
                    "" +
                        row("Reservation", "#" + reservation.getId()) +
                        row("Guest Name", safe(reservation.getCustomerName())) +
                        row("Table", table != null ? ("Table " + table.getTableNumber() + " (" + table.getType() + ")") : "N/A") +
                        row("Date", safe(reservation.getDate())) +
                        row("Arrival Time", safe(reservation.getTime())) +
                        row("Estimated Checkout", safe(reservation.getCtime())),
                    "See you soon — if your plans change, you can manage this booking anytime from your Luna Cove profile."
            );

            send(reservation.getEmail(), "Your Luna Cove reservation is confirmed", body);
        } catch (Exception ex) {
            log.warn("Failed to send reservation confirmation email: {}", ex.getMessage());
        }
    }

    @Async
    public void sendPaymentConfirmation(Payment payment) {
        Reservation reservation = payment != null ? payment.getReservation() : null;
        if (!canSend(reservation != null ? reservation.getEmail() : null)) return;

        try {
            String itemRows = buildOrderItemsHtml(payment.getOrderItemsJson());
            Table table = reservation.getTable();

            String body = wrapTemplate(
                    "Payment Received",
                    "Thank you for dining with Luna Cove — here is your receipt.",
                    "" +
                        row("Reservation", "#" + reservation.getId()) +
                        row("Table", table != null ? ("Table " + table.getTableNumber()) : "N/A") +
                        row("Payment Method", safe(payment.getMethod())) +
                        row("Status", safe(payment.getStatus())) +
                        (itemRows.isEmpty() ? "" : sectionDivider("Order Items") + itemRows) +
                        sectionDivider("") +
                        rowStrong("Total Paid", "LKR " + String.format("%,.2f", payment.getAmount())),
                    "This receipt has also been saved to your Luna Cove profile under Payment History."
            );

            send(reservation.getEmail(), "Your Luna Cove payment receipt", body);
        } catch (Exception ex) {
            log.warn("Failed to send payment confirmation email: {}", ex.getMessage());
        }
    }

    // ---------------- internals ----------------

    private boolean canSend(String email) {
        if (!mailEnabled) return false;
        if (email == null || email.isBlank()) {
            log.info("Skipping confirmation email — no email address on file for this reservation.");
            return false;
        }
        if (fromAddress == null || fromAddress.isBlank()) {
            log.info("Skipping confirmation email — spring.mail.username is not configured.");
            return false;
        }
        return true;
    }

    private void send(String to, String subject, String htmlBody) throws Exception {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
        helper.setTo(to);
        helper.setFrom(fromAddress);
        helper.setSubject(subject);
        helper.setText(htmlBody, true);
        mailSender.send(message);
        log.info("Sent email [{}] to {}", subject, to);
    }

    private String buildOrderItemsHtml(String orderItemsJson) {
        if (orderItemsJson == null || orderItemsJson.isBlank() || orderItemsJson.equals("[]")) {
            return "";
        }

        StringBuilder rows = new StringBuilder();
        // orderItemsJson is a simple JSON array of { name, price, quantity } written by the frontend.
        // Parsed with a light regex rather than pulling in a JSON library dependency for one field.
        var matcher = java.util.regex.Pattern
                .compile("\"name\"\\s*:\\s*\"([^\"]*)\"[^}]*\"price\"\\s*:\\s*([0-9.]+)[^}]*\"quantity\"\\s*:\\s*([0-9]+)")
                .matcher(orderItemsJson);

        while (matcher.find()) {
            String name = matcher.group(1);
            String price = matcher.group(2);
            String qty = matcher.group(3);
            rows.append(row(name + " &times; " + qty, "LKR " + price));
        }

        return rows.toString();
    }

    private String row(String label, String value) {
        return "<tr>"
                + "<td style=\"padding:8px 0;color:#5a564e;font-size:13px;\">" + label + "</td>"
                + "<td style=\"padding:8px 0;color:" + INK + ";font-size:13px;text-align:right;\">" + value + "</td>"
                + "</tr>";
    }

    private String rowStrong(String label, String value) {
        return "<tr>"
                + "<td style=\"padding:14px 0 4px;color:" + INK + ";font-size:15px;font-weight:700;\">" + label + "</td>"
                + "<td style=\"padding:14px 0 4px;color:" + GOLD + ";font-size:17px;font-weight:700;text-align:right;\">" + value + "</td>"
                + "</tr>";
    }

    private String sectionDivider(String label) {
        return "<tr><td colspan=\"2\" style=\"padding-top:12px;border-top:1px solid #e6e0d4;"
                + "font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#9c7d3f;padding-bottom:6px;\">"
                + label + "</td></tr>";
    }

    private String safe(String value) {
        return (value == null || value.isBlank()) ? "N/A" : value;
    }

    private String wrapTemplate(String heading, String subheading, String tableRowsHtml, String footerNote) {
        return "<!DOCTYPE html><html><body style=\"margin:0;padding:0;background:#0c0c0d;font-family:Georgia,'Times New Roman',serif;\">"
                + "<div style=\"max-width:520px;margin:0 auto;padding:32px 16px;\">"
                + "<div style=\"text-align:center;padding-bottom:24px;\">"
                + "<span style=\"font-size:22px;letter-spacing:4px;color:#e3c98a;\">LUNA COVE</span><br/>"
                + "<span style=\"font-size:10px;letter-spacing:3px;color:" + GOLD + ";text-transform:uppercase;\">Bespoke Dining</span>"
                + "</div>"
                + "<div style=\"background:#ffffff;border-radius:16px;padding:32px 28px;\">"
                + "<h1 style=\"margin:0 0 6px;font-size:22px;color:" + INK + ";font-weight:500;\">" + heading + "</h1>"
                + "<p style=\"margin:0 0 20px;font-size:13px;color:#5a564e;font-family:Arial,sans-serif;\">" + subheading + "</p>"
                + "<table style=\"width:100%;border-collapse:collapse;font-family:Arial,sans-serif;\">" + tableRowsHtml + "</table>"
                + "<p style=\"margin:24px 0 0;font-size:12px;color:#5a564e;font-family:Arial,sans-serif;line-height:1.6;\">" + footerNote + "</p>"
                + "</div>"
                + "<p style=\"text-align:center;font-size:11px;color:#6b6b6b;margin-top:20px;font-family:Arial,sans-serif;\">"
                + "&copy; 2026 Luna Cove Estate &middot; Kaduwela Road, Malabe &middot; concierge@lunacove.lk</p>"
                + "</div>"
                + "</body></html>";
    }
}
