package com.example.flights;
import org.springframework.data.jpa.repository.JpaRepository;import java.util.List;
public interface ReschedulingRequestRepository extends JpaRepository<ReschedulingRequest,Long>{List<ReschedulingRequest> findAllByUserEmailOrderByCreatedAtDesc(String email);}
