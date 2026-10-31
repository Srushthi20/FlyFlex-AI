package com.example.flights;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "flights")
public class Flight {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String airline;
    @Column(name="flight_number") private String flightNumber;
    @Column(name="origin_code") private String originCode;
    @Column(name="destination_code") private String destinationCode;
    @Column(name="departure_at") private LocalDateTime departureAt;
    @Column(name="arrival_at") private LocalDateTime arrivalAt;
    @Column(name="duration_minutes") private Integer durationMinutes;
    private BigDecimal fare;
    private Boolean available;
    @Column(name="change_fee") private BigDecimal changeFee;
    @Column(name="flexibility_score") private Integer flexibilityScore;

    public Long getId(){return id;} public String getAirline(){return airline;}
    public String getFlightNumber(){return flightNumber;} public String getOriginCode(){return originCode;}
    public String getDestinationCode(){return destinationCode;} public LocalDateTime getDepartureAt(){return departureAt;}
    public LocalDateTime getArrivalAt(){return arrivalAt;} public Integer getDurationMinutes(){return durationMinutes;}
    public BigDecimal getFare(){return fare;} public Boolean getAvailable(){return available;}
    public BigDecimal getChangeFee(){return changeFee;} public Integer getFlexibilityScore(){return flexibilityScore;}
}
