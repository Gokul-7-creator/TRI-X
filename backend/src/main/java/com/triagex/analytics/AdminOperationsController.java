package com.triagex.analytics;

import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Aggregates only. Administrators do not read patient intake or approve accounts. */
@RestController
@RequestMapping("/api/admin-operations")
@PreAuthorize("hasRole('ADMIN')")
public class AdminOperationsController {
  private final JdbcTemplate db;
  public AdminOperationsController(JdbcTemplate db) { this.db=db; }
  @GetMapping
  public Map<String,Object> overview() {
    return Map.of(
      "nurses",db.queryForObject("SELECT COUNT(*) FROM users WHERE role='NURSE' AND enabled=true",Long.class),
      "doctors",db.queryForObject("SELECT COUNT(*) FROM users WHERE role='DOCTOR' AND enabled=true",Long.class),
      "patientAccounts",db.queryForObject("SELECT COUNT(*) FROM users WHERE role='PATIENT' AND enabled=true",Long.class),
      "awaitingAssessment",db.queryForObject("SELECT COUNT(*) FROM patients WHERE status='AWAITING_ASSESSMENT'",Long.class),
      "recentActivity",db.queryForList("SELECT a.action,a.created_at,coalesce(u.role,registered.role,'SYSTEM') AS actor_role FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id LEFT JOIN users registered ON a.entity_type='USER' AND registered.id=a.entity_id ORDER BY a.created_at DESC LIMIT 15")
    );
  }
}
