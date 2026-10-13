package com.triagex.analytics;


import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Patient-facing read-only counts. Never returns patient names, IDs, complaints or priorities. */
@RestController
@RequestMapping("/api/patient-portal")
@PreAuthorize("hasRole('PATIENT')")
public class PatientPortalController {
  private final JdbcTemplate db;
  public PatientPortalController(JdbcTemplate db) { this.db = db; }

  @GetMapping("/summary")
  public Map<String,Object> summary() {
    long waiting = db.queryForObject("SELECT count(*) FROM queue_entries WHERE status='WAITING'", Long.class);
    long pending = db.queryForObject("SELECT count(*) FROM patients WHERE status='AWAITING_ASSESSMENT'", Long.class);
    long inConsultation = db.queryForObject("SELECT count(*) FROM queue_entries WHERE status='IN_CONSULTATION'", Long.class);
    
    // Only observed durations count as observed data. Otherwise use a visibly labelled planning assumption.
    
    boolean historical = false;
    int minutesPerVisit = 7;
    Long approximateMinutes = (waiting + pending) * (long) minutesPerVisit;
    Map<String,Object> result = new LinkedHashMap<>();
    result.put("patientsWaiting", waiting + pending);
    result.put("waitingForDoctor", waiting);
    result.put("awaitingAssessment", pending);
    result.put("inConsultation", inConsultation);
    result.put("approximateWaitMinutes", approximateMinutes);
    result.put("usesHistoricalAverage", historical);
    result.put("estimatedMinutesPerConsultation", minutesPerVisit);
    result.put("estimateNote",
    "Estimated waiting time based on 7 minutes per patient. Actual waiting time may vary depending on patient priority and doctor availability.");
    return result;
  }
}
