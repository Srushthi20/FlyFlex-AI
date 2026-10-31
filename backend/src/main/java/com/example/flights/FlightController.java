
package com.example.flights;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:5173"})
public class FlightController {

    private final FlightRepository flights;
    private final ReschedulingRequestRepository requests;
    private final AppUserRepository users;

    public FlightController(
            FlightRepository flights,
            ReschedulingRequestRepository requests,
            AppUserRepository users) {
        this.flights = flights;
        this.requests = requests;
        this.users = users;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP", "mode", "SIMULATED_FLIGHT_DATA");
    }

    @GetMapping("/flights/search")
    public List<Flight> search(
            @RequestParam(defaultValue = "BLR") String origin,
            @RequestParam(defaultValue = "DEL") String destination,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate) {

        LocalDate from = fromDate == null ? LocalDate.now() : fromDate;
        LocalDate to = toDate == null ? from.plusDays(30) : toDate;

        if (to.isBefore(from)) {
            throw new IllegalArgumentException(
                    "toDate must be on or after fromDate");
        }

        return flights
                .findByOriginCodeIgnoreCaseAndDestinationCodeIgnoreCaseAndAvailableTrueAndDepartureAtBetweenOrderByDepartureAt(
                        origin,
                        destination,
                        from.atStartOfDay(),
                        to.plusDays(1).atStartOfDay().minusNanos(1));
    }

    public record RecommendationRequest(
            String origin,
            String destination,
            LocalDate examCompletionDate,
            int bufferDays,
            BigDecimal eligibleTicketCredit,
            LocalDate fromDate,
            LocalDate toDate) {}

    public record FlightOption(
            Flight flight,
            BigDecimal additionalPayment,
            double score,
            String reason) {}

    @PostMapping("/recommendations")
    public List<FlightOption> recommend(
            @RequestBody RecommendationRequest req) {

        LocalDate earliest = req.examCompletionDate()
                .plusDays(Math.max(0, req.bufferDays()));

        List<Flight> candidates =
                flights.findByOriginCodeIgnoreCaseAndDestinationCodeIgnoreCaseAndAvailableTrueAndDepartureAtBetweenOrderByDepartureAt(
                        req.origin(),
                        req.destination(),
                        (req.fromDate() == null ? earliest : req.fromDate())
                                .atStartOfDay(),
                        (req.toDate() == null ? earliest.plusDays(30) : req.toDate())
                                .plusDays(1).atStartOfDay().minusNanos(1));

        BigDecimal credit = req.eligibleTicketCredit() == null
                ? BigDecimal.ZERO
                : req.eligibleTicketCredit();

        return candidates.stream()
                .filter(f -> !f.getDepartureAt().toLocalDate().isBefore(earliest))
                .map(f -> {
                    BigDecimal payment = f.getFare()
                            .add(f.getChangeFee())
                            .subtract(credit)
                            .max(BigDecimal.ZERO);

                    double costScore =
                            1.0 / (1.0 + payment.doubleValue() / 1000.0);

                    double flexibility =
                            Math.max(0, Math.min(1, f.getFlexibilityScore() / 5.0));

                    double score = 0.75 * costScore + 0.25 * flexibility;

                    return new FlightOption(
                            f,
                            payment,
                            score,
                            "Eligible after exam buffer; ranked by estimated additional payment and change flexibility.");
                })
                .sorted(Comparator.comparingDouble(FlightOption::score).reversed())
                .toList();
    }

    public record ConfirmRequest(
            String bookingReference,
            String origin,
            String destination,
            LocalDate originalDepartureDate,
            LocalDate examCompletionDate,
            int bufferDays,
            Long selectedFlightId,
            BigDecimal eligibleTicketCredit) {}

    @PostMapping("/rescheduling/confirm")
    public ReschedulingRequest confirm(
            @RequestBody ConfirmRequest req,
            org.springframework.security.core.Authentication authentication) {

        Flight flight = flights.findById(req.selectedFlightId())
                .orElseThrow(() ->
                        new NoSuchElementException("Selected flight not found"));

        LocalDate earliest = req.examCompletionDate()
                .plusDays(Math.max(0, req.bufferDays()));

        if (flight.getDepartureAt().toLocalDate().isBefore(earliest)) {
            throw new IllegalArgumentException(
                    "Selected flight conflicts with the examination schedule.");
        }

        if (!flight.getAvailable()
                || !flight.getOriginCode().equalsIgnoreCase(req.origin())
                || !flight.getDestinationCode().equalsIgnoreCase(req.destination())) {
            throw new IllegalArgumentException(
                    "Selected flight is unavailable or route does not match.");
        }

        BigDecimal credit = req.eligibleTicketCredit() == null
                ? BigDecimal.ZERO
                : req.eligibleTicketCredit();

        BigDecimal totalCost = flight.getFare().add(flight.getChangeFee());

        BigDecimal payment = totalCost.subtract(credit)
                .max(BigDecimal.ZERO);

        AppUser user = users.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() ->
                        new NoSuchElementException("User not found"));

        ReschedulingRequest request = new ReschedulingRequest(
                req.bookingReference(),
                req.origin(),
                req.destination(),
                req.originalDepartureDate(),
                req.examCompletionDate(),
                req.bufferDays(),
                flight,
                credit,
                payment,
                user);

        if (payment.compareTo(BigDecimal.ZERO) > 0) {
            request.setStatus("PAYMENT_PENDING");
        } else if (credit.compareTo(totalCost) > 0) {
            request.setStatus("REFUND_PENDING");
        } else {
            request.setStatus("SIMULATED_REQUESTED");
        }

        return requests.save(request);
    }

    // Demo UPI payment confirmation
    @PostMapping("/rescheduling/{id}/payment")
    public ReschedulingRequest confirmDemoPayment(
            @PathVariable Long id,
            org.springframework.security.core.Authentication authentication) {

        ReschedulingRequest request = getOwnedRequest(id, authentication);

        if (!"PENDING".equals(request.getPaymentStatus())
                || request.getAdditionalPayment()
                        .compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "No pending payment exists for this request.");
        }

        request.setPaymentStatus("DEMO_PAID");
        request.setPaymentMethod("DEMO_UPI");
        request.setStatus("SIMULATED_REQUESTED");

        return requests.save(request);
    }

    // Demo refund request confirmation
    @PostMapping("/rescheduling/{id}/refund")
    public ReschedulingRequest submitDemoRefund(
            @PathVariable Long id,
            org.springframework.security.core.Authentication authentication) {

        ReschedulingRequest request = getOwnedRequest(id, authentication);

        if (!"PENDING".equals(request.getRefundStatus())
                || request.getRefundAmount()
                        .compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(
                    "No pending refund exists for this request.");
        }

        request.setRefundStatus("DEMO_REFUND_REQUESTED");
        request.setStatus("SIMULATED_REQUESTED");

        return requests.save(request);
    }

    private ReschedulingRequest getOwnedRequest(
            Long id,
            org.springframework.security.core.Authentication authentication) {

        ReschedulingRequest request = requests.findById(id)
                .orElseThrow(() ->
                        new NoSuchElementException("Request not found"));

        if (!request.getUser().getEmail()
                .equalsIgnoreCase(authentication.getName())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You cannot access another user's request.");
        }

        return request;
    }

    @GetMapping("/rescheduling/history")
    public List<ReschedulingRequest> history(
            org.springframework.security.core.Authentication authentication) {

        return requests.findAllByUserEmailOrderByCreatedAtDesc(
                authentication.getName());
    }

    @GetMapping("/admin/users")
    public List<AppUser> adminUsers() {
        return users.findAll();
    }

    @GetMapping("/admin/rescheduling")
    public List<ReschedulingRequest> adminRescheduling() {
        return requests.findAll();
    }
}
