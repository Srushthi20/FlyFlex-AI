package com.example.flights.security;
import io.jsonwebtoken.*;import io.jsonwebtoken.security.Keys;import javax.crypto.SecretKey;import org.springframework.beans.factory.annotation.Value;import org.springframework.stereotype.Service;import java.util.*;import java.util.Date;
@Service public class JwtService {
 private final SecretKey key; private final long expiration;
 public JwtService(@Value("${app.jwt.secret}") String secret,@Value("${app.jwt.expiration-ms:86400000}") long expiration){byte[] raw=Base64.getDecoder().decode(secret);this.key=Keys.hmacShaKeyFor(raw);this.expiration=expiration;}
 public String create(String email,String role){Date now=new Date();return Jwts.builder().subject(email).claim("role",role).issuedAt(now).expiration(new Date(now.getTime()+expiration)).signWith(key).compact();}
 public Claims parse(String token){return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();}
}
