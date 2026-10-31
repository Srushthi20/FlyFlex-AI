package com.example.flights.auth;
import jakarta.validation.constraints.*;
public record RegisterRequest(@NotBlank @Size(max=100) String fullName,@NotBlank @Email @Size(max=150) String email,@NotBlank @Size(min=8,max=72) String password){}
