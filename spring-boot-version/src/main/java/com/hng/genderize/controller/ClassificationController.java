package com.hng.genderize.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import jakarta.servlet.http.HttpServletRequest;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ClassificationController {

    private final RestTemplate restTemplate;

    public ClassificationController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @GetMapping("/classify")
    public ResponseEntity<Map<String, Object>> classifyName(
            @RequestParam(value = "name", required = false) String name,
            HttpServletRequest request) {
        
        // Validation: Missing or empty
        if (name == null || name.trim().isEmpty()) {
            return buildErrorResponse("Name parameter is required", HttpStatus.BAD_REQUEST);
        }

        // Validation: Non-string name check (e.g., array like ?name[]=peter or duplicates ?name=a&name=b)
        if (request.getParameterValues("name") != null && request.getParameterValues("name").length > 1) {
            return buildErrorResponse("Name must be a string", HttpStatus.UNPROCESSABLE_ENTITY); // 422
        }
        if (request.getParameter("name[]") != null) {
            return buildErrorResponse("Name must be a string", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        
        try {
            String url = "https://api.genderize.io/?name=" + name;
            GenderizeResponse apiResponse = restTemplate.getForObject(url, GenderizeResponse.class);

            // Edge Case: gender null or count 0
            if (apiResponse == null || apiResponse.getGender() == null || apiResponse.getCount() == 0) {
                return buildErrorResponse("No prediction available for the provided name", HttpStatus.NOT_FOUND);
            }

            boolean isConfident = apiResponse.getProbability() >= 0.7 && apiResponse.getCount() >= 100;
            String processedAt = ZonedDateTime.now(ZoneOffset.UTC).format(DateTimeFormatter.ISO_INSTANT);

            Map<String, Object> data = new HashMap<>();
            data.put("name", apiResponse.getName());
            data.put("gender", apiResponse.getGender());
            data.put("probability", apiResponse.getProbability());
            data.put("sample_size", apiResponse.getCount());
            data.put("is_confident", isConfident);
            data.put("processed_at", processedAt);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("data", data);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return buildErrorResponse("Internal server error", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private ResponseEntity<Map<String, Object>> buildErrorResponse(String message, HttpStatus status) {
        Map<String, Object> error = new HashMap<>();
        error.put("status", "error");
        error.put("message", message);
        return new ResponseEntity<>(error, status);
    }

    // Inner class for deserializing
    public static class GenderizeResponse {
        private String name;
        private String gender;
        private double probability;
        private int count;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getGender() { return gender; }
        public void setGender(String gender) { this.gender = gender; }
        public double getProbability() { return probability; }
        public void setProbability(double probability) { this.probability = probability; }
        public int getCount() { return count; }
        public void setCount(int count) { this.count = count; }
    }
}
