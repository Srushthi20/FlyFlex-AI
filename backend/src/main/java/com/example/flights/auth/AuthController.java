
package com.example.flights.auth;

import com.example.flights.*;
import com.example.flights.security.JwtService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AppUserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthController(
            AppUserRepository users,
            PasswordEncoder encoder,
            JwtService jwt) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest r) {

        String email = r.email().trim().toLowerCase();

        if (users.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email is already registered"
            );
        }

        // Public registration can create USER accounts only.
        AppUser user = users.save(
                new AppUser(
                        r.fullName().trim(),
                        email,
                        encoder.encode(r.password()),
                        "USER"
                )
        );

        return response(user);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest r) {

        AppUser user = users.findByEmailIgnoreCase(r.email().trim())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Invalid email or password"
                ));

        if (!encoder.matches(r.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid email or password"
            );
        }

        return response(user);
    }

    private AuthResponse response(AppUser user) {
        return new AuthResponse(
                jwt.create(user.getEmail(), user.getRole()),
                user.getFullName(),
                user.getEmail(),
                user.getRole()
        );
    }
}
