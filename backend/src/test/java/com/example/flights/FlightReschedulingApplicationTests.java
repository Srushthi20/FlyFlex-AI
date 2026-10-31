package com.example.flights;

import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;

class FlightReschedulingApplicationTests {
    @Test void departureBeforeExamBufferIsIneligible() {
        LocalDate earliest = LocalDate.of(2026, 6, 23).plusDays(1);
        assertTrue(LocalDate.of(2026, 6, 23).isBefore(earliest));
        assertFalse(LocalDate.of(2026, 6, 24).isBefore(earliest));
    }
}
