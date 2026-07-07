package com.codeWithProject.HotelServer.controller.auth;

import com.codeWithProject.HotelServer.entity.Feedback;
import com.codeWithProject.HotelServer.services.Feedback.FeedbackService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/feedbacks")
@CrossOrigin
public class FeedbackController {

    @Autowired
    private FeedbackService feedbackService;

    // CREATE
    @PostMapping
    public Feedback addFeedback(
            @RequestBody Feedback feedback,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        return feedbackService.addFeedback(feedback, authorizationHeader);
    }

    // GET ALL
    @GetMapping
    public List<Feedback> getAllFeedbacks() {
        return feedbackService.getAllFeedbacks();
    }

    // GET by table (IMPORTANT for your UI)
    @GetMapping("/table/{id}")
    public List<Feedback> getFeedbackByTable(@PathVariable Long id) {
        return feedbackService.getFeedbackByTable(id);
    }

    //  rating
    @GetMapping("/table/{id}/rating")
    public Double getTableRating(@PathVariable Long id) {
        return feedbackService.getTableRating(id);
    }

    // UPDATE
    @PutMapping("/{id}")
    public Feedback updateFeedback(
            @PathVariable Long id,
            @RequestBody Feedback feedback,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        return feedbackService.updateFeedback(id, feedback, authorizationHeader);
    }

    // DELETE
    @DeleteMapping("/{id}")
    public void deleteFeedback(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        feedbackService.deleteFeedback(id, authorizationHeader);
    }
}
