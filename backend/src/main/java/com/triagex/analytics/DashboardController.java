package com.triagex.analytics;
import com.triagex.core.Support;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api")
@PreAuthorize("hasAnyRole('ADMIN','DOCTOR','NURSE')")
public class DashboardController {
  private final JdbcTemplate db;
  public DashboardController(JdbcTemplate db){this.db=db;}
  @GetMapping("/dashboard") public Object dashboard(){
    return Map.of(
      "patients",db.queryForObject("SELECT count(*) FROM patients",Long.class),
      "waiting",db.queryForObject("SELECT count(*) FROM queue_entries WHERE status='WAITING'",Long.class),
      "critical",db.queryForObject("SELECT count(*) FROM queue_entries WHERE status='WAITING' AND priority='CRITICAL'",Long.class),
      "urgent",db.queryForObject("SELECT count(*) FROM queue_entries WHERE status='WAITING' AND priority='URGENT'",Long.class),
      "normal",db.queryForObject("SELECT count(*) FROM queue_entries WHERE status='WAITING' AND priority='NORMAL'",Long.class),
      "inConsultation",db.queryForObject("SELECT count(*) FROM queue_entries WHERE status='IN_CONSULTATION'",Long.class),
      "completed",db.queryForObject("SELECT count(*) FROM queue_entries WHERE status='COMPLETED'",Long.class),
      "today",db.queryForObject("SELECT count(*) FROM patients WHERE created_at::date=CURRENT_DATE",Long.class)
    );
  }
  @GetMapping("/analytics") public Object analytics(){
    return Map.of(
      "daily",db.queryForList("SELECT to_char(created_at::date,'Mon DD') AS day,count(*) AS total FROM patients WHERE created_at >= now()-interval '14 days' GROUP BY created_at::date ORDER BY created_at::date"),
      "priority",db.queryForList("SELECT priority,count(*) AS total FROM queue_entries GROUP BY priority"),
      "status",db.queryForList("SELECT status,count(*) AS total FROM patients GROUP BY status"),
      "doctors",db.queryForList("SELECT u.full_name AS name,count(c.id) AS consultations FROM users u LEFT JOIN consultations c ON u.id=c.doctor_id WHERE u.role='DOCTOR' GROUP BY u.id,u.full_name ORDER BY consultations DESC"),
      "averageMinutes",db.queryForObject("SELECT coalesce(round(avg(extract(epoch from (started_at-joined_at))/60)::numeric,1),0) FROM queue_entries WHERE started_at IS NOT NULL",java.math.BigDecimal.class)
    );
  }
  @GetMapping("/audit") @PreAuthorize("hasRole('ADMIN')") public Object audit(){
    return db.queryForList("SELECT a.*,u.full_name AS actor FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 100");
  }
  @GetMapping("/health") @PreAuthorize("permitAll()") public Object health(){return Map.of("status","ok");}
}
