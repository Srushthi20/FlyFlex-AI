package com.example.flights;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface FlightRepository extends JpaRepository<Flight, Long> {
    List<Flight> findByOriginCodeIgnoreCaseAndDestinationCodeIgnoreCaseAndAvailableTrueAndDepartureAtBetweenOrderByDepartureAt(
        String originCode, String destinationCode, LocalDateTime from, LocalDateTime to);
}
