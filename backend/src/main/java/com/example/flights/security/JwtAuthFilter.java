package com.example.flights.security;
import com.example.flights.AppUser;import com.example.flights.AppUserRepository;import io.jsonwebtoken.Claims;import jakarta.servlet.*;import jakarta.servlet.http.*;import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;import org.springframework.security.core.authority.SimpleGrantedAuthority;import org.springframework.security.core.context.SecurityContextHolder;import org.springframework.stereotype.Component;import org.springframework.web.filter.OncePerRequestFilter;import java.io.IOException;import java.util.List;
@Component public class JwtAuthFilter extends OncePerRequestFilter {
 private final JwtService jwt;private final AppUserRepository users;public JwtAuthFilter(JwtService jwt,AppUserRepository users){this.jwt=jwt;this.users=users;}
 @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException{
  String h=req.getHeader("Authorization");if(h!=null&&h.startsWith("Bearer ")){try{Claims c=jwt.parse(h.substring(7));AppUser u=users.findByEmailIgnoreCase(c.getSubject()).orElse(null);if(u!=null){var auth=new UsernamePasswordAuthenticationToken(u.getEmail(),null,List.of(new SimpleGrantedAuthority("ROLE_"+u.getRole())));SecurityContextHolder.getContext().setAuthentication(auth);}}catch(Exception ignored){SecurityContextHolder.clearContext();}}
  chain.doFilter(req,res);
 }
}
