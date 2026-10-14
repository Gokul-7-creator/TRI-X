package com.triagex.triage;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AiExplanationService {

    private final String apiKey;
    private final ObjectMapper mapper;

    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    public AiExplanationService(
            @Value("${OPENAI_API_KEY:}") String apiKey,
            ObjectMapper mapper) {

        this.apiKey = apiKey;
        this.mapper = mapper;
    }

    public String generateExplanation(
            String priority,
            String flags) throws Exception {

        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "OpenAI API key is missing");
        }

        String instructions = """
            You explain a rule-based hospital triage DEMO.

            The priority has already been assigned by Java.

            Explain ONLY why the supplied rules produced
            the supplied priority.

            Do not change the priority.
            Do not invent symptoms or medical findings.
            Do not diagnose or recommend treatments.

            Explain in 2 to 3 simple sentences.
            State that the nurse must review the result.
            These rules are not clinically validated.

            If no warning rule was triggered, do not
            claim that the patient is healthy or safe.
            """;

        String input =
                "Assigned priority: " + priority +
                "\nTriggered rule flags: " +
                (flags == null || flags.isBlank()
                        ? "None"
                        : flags);

        String body = mapper.writeValueAsString(
                Map.of(
                        "model", "gpt-4.1-mini",
                        "instructions", instructions,
                        "input", input,
                        "max_output_tokens", 180,
                        "store", false
                )
        );

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(
                        "https://api.openai.com/v1/responses"))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(10))
                .POST(HttpRequest.BodyPublishers.ofString(
                        body, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = client.send(
                request,
                HttpResponse.BodyHandlers.ofString()
        );

        if (response.statusCode() != 200) {
            throw new IllegalStateException(
                    "OpenAI HTTP error: " +
                    response.statusCode());
        }

        JsonNode result = mapper.readTree(response.body());

        for (JsonNode item : result.path("output")) {
            for (JsonNode part : item.path("content")) {
                if ("output_text".equals(
                        part.path("type").asText())) {

                    String text = part.path("text")
                            .asText("")
                            .trim();

                    if (!text.isEmpty()) {
                        return text;
                    }
                }
            }
        }

        throw new IllegalStateException(
                "No explanation returned");
    }
}
