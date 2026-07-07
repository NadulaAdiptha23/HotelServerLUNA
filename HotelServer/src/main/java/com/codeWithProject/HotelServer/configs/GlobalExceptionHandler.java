package com.codeWithProject.HotelServer.configs;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Without this, every RuntimeException thrown from a service (e.g.
 * "Table number already exists", "Menu item name already exists") was
 * surfacing to the frontend as Spring Boot's generic, unhelpful 500 JSON
 * body — the raw {"timestamp":...,"status":500,"error":"Internal Server
 * Error"} blob with no indication of what actually went wrong.
 *
 * This translates known business-rule messages into the correct HTTP
 * status (409 for "already exists", 400 for validation problems, 404 for
 * "not found") and always includes a human-readable "message" field the
 * frontend can show directly to the admin or guest.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntimeException(RuntimeException ex) {
        String message = ex.getMessage() != null ? ex.getMessage() : "Something went wrong. Please try again.";
        HttpStatus status = resolveStatus(message);
        return ResponseEntity.status(status).body(buildBody(status, message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpectedException(Exception ex) {
        HttpStatus status = HttpStatus.INTERNAL_SERVER_ERROR;
        return ResponseEntity.status(status).body(buildBody(status, "An unexpected server error occurred. Please try again."));
    }

    private HttpStatus resolveStatus(String message) {
        String lower = message.toLowerCase();
        if (lower.contains("already exists") || lower.contains("already booked")) return HttpStatus.CONFLICT;
        if (lower.contains("not found")) return HttpStatus.NOT_FOUND;
        return HttpStatus.BAD_REQUEST;
    }

    private Map<String, Object> buildBody(HttpStatus status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        return body;
    }
}
