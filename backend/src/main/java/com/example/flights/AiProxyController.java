
package com.example.flights;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiProxyController {

    private final String aiServiceUrl;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public AiProxyController(
            @Value("${ai.service.url:http://127.0.0.1:8001}") String url,
            ObjectMapper objectMapper) {

        this.aiServiceUrl = url.replaceAll("/+$", "");
        this.objectMapper = objectMapper;
       
        this.httpClient = HttpClient.newBuilder()
        .version(HttpClient.Version.HTTP_1_1)
        .build();
    }

    @PostMapping("/predict-delay")
    public ResponseEntity<?> predict(
            @RequestBody Map<String, Object> request) {

        return forward("/predict-delay", request);
    }

    @PostMapping("/match-flights")
    public ResponseEntity<?> match(
            @RequestBody Map<String, Object> request) {

        return forward("/match-flights", request);
    }

    private ResponseEntity<?> forward(
            String endpoint,
            Map<String, Object> request) {

        try {
            String json = objectMapper.writeValueAsString(request);

            System.out.println("AI request: " + json);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(aiServiceUrl + endpoint))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    httpRequest,
                    HttpResponse.BodyHandlers.ofString()
            );

            System.out.println("AI service status: " + response.statusCode());
            System.out.println("AI service response: " + response.body());

            Map responseBody = objectMapper.readValue(
                    response.body(),
                    Map.class
            );

            return ResponseEntity
                    .status(response.statusCode())
                    .body(responseBody);

        } catch (JsonProcessingException ex) {

            ex.printStackTrace();

            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Could not convert request to JSON"));

        } catch (InterruptedException ex) {

            Thread.currentThread().interrupt();

            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "AI request was interrupted"));

        } catch (IOException | RuntimeException ex) {

            ex.printStackTrace();

            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", ex.getMessage() == null
                            ? "AI service communication failed"
                            : ex.getMessage()));
        }
    }
}
