
package com.example.flights;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "rescheduling_requests")
public class ReschedulingRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "original_booking_reference")
    private String originalBookingReference;

    @Column(name = "origin_code")
    private String originCode;

    @Column(name = "destination_code")
    private String destinationCode;

    @Column(name = "original_departure_date")
    private LocalDate originalDepartureDate;

    @Column(name = "revised_exam_completion_date")
    private LocalDate revisedExamCompletionDate;

    @Column(name = "buffer_days")
    private Integer bufferDays;

    @ManyToOne
    @JoinColumn(name = "selected_flight_id")
    private Flight selectedFlight;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(name = "original_ticket_credit")
    private BigDecimal originalTicketCredit;

    @Column(name = "new_fare")
    private BigDecimal newFare;

    @Column(name = "change_fee")
    private BigDecimal changeFee;

    @Column(name = "additional_payment")
    private BigDecimal additionalPayment;

    private String status;

    @Column(name = "payment_status")
    private String paymentStatus = "NOT_REQUIRED";

    @Column(name = "refund_status")
    private String refundStatus = "NOT_APPLICABLE";

    @Column(name = "refund_amount")
    private BigDecimal refundAmount = BigDecimal.ZERO;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public ReschedulingRequest() {
    }

    public ReschedulingRequest(
            String ref,
            String origin,
            String destination,
            LocalDate oldDate,
            LocalDate examDate,
            int buffer,
            Flight flight,
            BigDecimal credit,
            BigDecimal payment,
            AppUser user) {

        this.originalBookingReference = ref;
        this.originCode = origin;
        this.destinationCode = destination;
        this.originalDepartureDate = oldDate;
        this.revisedExamCompletionDate = examDate;
        this.bufferDays = buffer;
        this.selectedFlight = flight;
        this.user = user;

        this.originalTicketCredit = credit;
        this.newFare = flight.getFare();
        this.changeFee = flight.getChangeFee();
        this.additionalPayment = payment;

        this.refundAmount = credit
                .subtract(flight.getFare().add(flight.getChangeFee()))
                .max(BigDecimal.ZERO);

        if (payment.compareTo(BigDecimal.ZERO) > 0) {
            this.paymentStatus = "PENDING";
            this.paymentMethod = "DEMO_UPI";
        } else {
            this.paymentStatus = "NOT_REQUIRED";
        }

        if (refundAmount.compareTo(BigDecimal.ZERO) > 0) {
            this.refundStatus = "PENDING";
        } else {
            this.refundStatus = "NOT_APPLICABLE";
        }

        this.status =  "SIMULATED_REQUESTED";
    }

    public Long getId() {
        return id;
    }

    public String getOriginalBookingReference() {
        return originalBookingReference;
    }

    public String getOriginCode() {
        return originCode;
    }

    public String getDestinationCode() {
        return destinationCode;
    }

    public LocalDate getOriginalDepartureDate() {
        return originalDepartureDate;
    }

    public LocalDate getRevisedExamCompletionDate() {
        return revisedExamCompletionDate;
    }

    public Integer getBufferDays() {
        return bufferDays;
    }

    public Flight getSelectedFlight() {
        return selectedFlight;
    }

    public AppUser getUser() {
        return user;
    }

    public BigDecimal getOriginalTicketCredit() {
        return originalTicketCredit;
    }

    public BigDecimal getNewFare() {
        return newFare;
    }

    public BigDecimal getChangeFee() {
        return changeFee;
    }

    public BigDecimal getAdditionalPayment() {
        return additionalPayment;
    }

    public String getStatus() {
        return status;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public String getRefundStatus() {
        return refundStatus;
    }

    public BigDecimal getRefundAmount() {
        return refundAmount;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public void setRefundStatus(String refundStatus) {
        this.refundStatus = refundStatus;
    }

    public void setStatus(String status) {
        this.status = status;
    }
    public void setPaymentMethod(String paymentMethod) {
    this.paymentMethod = paymentMethod;
}
}
