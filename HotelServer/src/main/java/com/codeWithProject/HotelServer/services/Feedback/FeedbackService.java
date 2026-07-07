package com.codeWithProject.HotelServer.services.Feedback;

import com.codeWithProject.HotelServer.entity.Feedback;
import com.codeWithProject.HotelServer.entity.Reservation;
import com.codeWithProject.HotelServer.entity.User;
import com.codeWithProject.HotelServer.enums.UserRole;
import com.codeWithProject.HotelServer.repository.FeedbackRepository;
import com.codeWithProject.HotelServer.repository.ReservationRepository;
import com.codeWithProject.HotelServer.repository.UserRepository;
import com.codeWithProject.HotelServer.utill.JwtUtil;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class FeedbackService {

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private ReservationRepository reservationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    public Feedback addFeedback(Feedback feedback, String authorizationHeader) {
        User currentUser = getCurrentUser(authorizationHeader);

        Long reservationId = feedback.getReservation().getId();

        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));

        if (feedbackRepository.existsByReservationId(reservationId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Feedback already given!");
        }

        validateRating(feedback.getRating());

        feedback.setReservation(reservation);
        feedback.setUser(currentUser);

        return feedbackRepository.save(feedback);
    }

    // GET ALL
    public List<Feedback> getAllFeedbacks() {
        return feedbackRepository.findAll();
    }

    // GET feedback by table (UI use)
    public List<Feedback> getFeedbackByTable(Long tableId) {
        return feedbackRepository.findByReservation_Table_Id(tableId);
    }

    // average rating
    public Double getTableRating(Long tableId) {
        return feedbackRepository.getAverageRatingByTableId(tableId);
    }

    public Feedback updateFeedback(Long id, Feedback feedback, String authorizationHeader) {
        User currentUser = getCurrentUser(authorizationHeader);
        Feedback existingFeedback = getFeedbackById(id);

        if (!isFeedbackOwner(existingFeedback, currentUser)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can update only your own feedback");
        }

        validateRating(feedback.getRating());
        existingFeedback.setRating(feedback.getRating());
        existingFeedback.setMessage(feedback.getMessage());

        return feedbackRepository.save(existingFeedback);
    }

    public void deleteFeedback(Long id, String authorizationHeader) {
        User currentUser = getCurrentUser(authorizationHeader);
        Feedback feedback = getFeedbackById(id);

        if (!isAdmin(currentUser) && !isFeedbackOwner(feedback, currentUser)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can delete only your own feedback");
        }

        feedbackRepository.delete(feedback);
    }

    private Feedback getFeedbackById(Long id) {
        return feedbackRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback not found"));
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

    private boolean isFeedbackOwner(Feedback feedback, User user) {
        return feedback.getUser() != null && feedback.getUser().getId().equals(user.getId());
    }

    private boolean isAdmin(User user) {
        return user.getResolvedUserRole() == UserRole.ADMIN;
    }

    private void validateRating(int rating) {
        if (rating < 1 || rating > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rating must be 1 to 5");
        }
    }
}
