package com.triagex.queue;
import com.triagex.core.Support;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

@RestController @RequestMapping("/api/queue")
@PreAuthorize("hasAnyRole('DOCTOR','NURSE')")
public class QueueController {
  private final JdbcTemplate db; private final Support sup;
  public QueueController(JdbcTemplate db,Support sup){this.db=db;this.sup=sup;}
  @GetMapping
public Object queue() {

    String sql = """
        SELECT q.*,
               p.patient_code,
               p.name,
               p.age,
               p.complaint,
               u.full_name AS doctor_name,
               CASE
                   WHEN q.priority = 'CRITICAL' THEN 'SENIOR'
                   ELSE 'JUNIOR'
               END AS assigned_grade,
               ROUND(
                   EXTRACT(EPOCH FROM (NOW() - q.joined_at)) / 60
               ) AS waiting_minutes
        FROM queue_entries q
        JOIN patients p ON p.id = q.patient_id
        LEFT JOIN users u ON u.id = q.doctor_id
        WHERE q.status IN ('WAITING', 'IN_CONSULTATION')
        """;

    String order = """
        ORDER BY
            CASE q.status
                WHEN 'IN_CONSULTATION' THEN 0
                ELSE 1
            END,
            CASE q.priority
                WHEN 'CRITICAL' THEN 0
                WHEN 'URGENT' THEN 1
                ELSE 2
            END,
            q.joined_at
        """;

    if ("DOCTOR".equals(sup.role())) {

        String doctorFilter = """
            AND (
                (
                    q.status = 'WAITING'
                    AND EXISTS (
                        SELECT 1
                        FROM users d
                        WHERE d.id = ?
                          AND d.role = 'DOCTOR'
                          AND d.enabled = true
                          AND d.approved = true
                          AND d.doctor_grade =
                              CASE
                                  WHEN q.priority = 'CRITICAL'
                                      THEN 'SENIOR'
                                  ELSE 'JUNIOR'
                              END
                    )
                )
                OR
                (
                    q.status = 'IN_CONSULTATION'
                    AND q.doctor_id = ?
                )
            )
            """;

        return db.queryForList(
                sql + doctorFilter + order,
                sup.userId(),
                sup.userId()
        );
    }

    return db.queryForList(sql + order);
}
  @GetMapping("/doctors")
public Object doctors() {

    return db.queryForList("""
        SELECT
            id,
            full_name AS name,
            doctor_grade AS grade
        FROM users
        WHERE role = 'DOCTOR'
          AND approved = true
          AND enabled = true
        ORDER BY
            CASE doctor_grade
                WHEN 'SENIOR' THEN 0
                ELSE 1
            END,
            full_name
        """);
}
  @GetMapping("/monitoring") @PreAuthorize("hasRole('NURSE')") public Object monitoring(@RequestParam(defaultValue="30") int minutes){
    if(minutes<1 || minutes>1440) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Interval must be 1–1440 minutes");
    return db.queryForList("SELECT q.patient_id,p.patient_code,p.name,q.priority,q.joined_at,round(extract(epoch from (now()-coalesce((SELECT max(a.created_at) FROM assessments a WHERE a.patient_id=q.patient_id),q.joined_at)))/60) AS minutes_since_review FROM queue_entries q JOIN patients p ON p.id=q.patient_id WHERE q.status='WAITING' AND now()-coalesce((SELECT max(a.created_at) FROM assessments a WHERE a.patient_id=q.patient_id),q.joined_at) > (? * interval '1 minute') ORDER BY q.joined_at",minutes);
  }
  @PostMapping("/{patientId}/start") @PreAuthorize("hasAnyRole('ADMIN','DOCTOR')") @Transactional
  public Map<String,String> start(@PathVariable long patientId) {
    long doctor=sup.userId();
    if(!sup.role().equals("DOCTOR")) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"A doctor account must start the consultation");
    int changed = db.update("""
    UPDATE queue_entries
    SET status = 'IN_CONSULTATION',
        doctor_id = ?,
        started_at = NOW()
    WHERE patient_id = ?
      AND status = 'WAITING'
      AND EXISTS (
          SELECT 1
          FROM users d
          WHERE d.id = ?
            AND d.role = 'DOCTOR'
            AND d.enabled = true
            AND d.approved = true
            AND d.doctor_grade =
                CASE
                    WHEN queue_entries.priority = 'CRITICAL'
                        THEN 'SENIOR'
                    ELSE 'JUNIOR'
                END
      )
    """,
    doctor,
    patientId,
    doctor
);
    if(changed==0) throw new ResponseStatusException(HttpStatus.CONFLICT,"Patient is not waiting or has already been claimed");
    db.update("INSERT INTO consultations(patient_id,doctor_id) VALUES(?,?)",patientId,doctor);
    db.update("UPDATE patients SET status='IN_CONSULTATION' WHERE id=?",patientId);
    sup.audit("START_CONSULTATION","PATIENT",patientId,"Doctor opened consultation"); sup.notifyChange();
    return Map.of("message","Consultation started");
  }
  public record Finish(String notes){}
  @PostMapping("/{patientId}/finish") @PreAuthorize("hasAnyRole('ADMIN','DOCTOR')") @Transactional
  public Map<String,String> finish(@PathVariable long patientId,@RequestBody Finish request) {
    long doctor=sup.userId();
    int count=db.update("UPDATE queue_entries SET status='COMPLETED',completed_at=now() WHERE patient_id=? AND status='IN_CONSULTATION' AND doctor_id=?",patientId,doctor);
    if(count==0) throw new ResponseStatusException(HttpStatus.CONFLICT,"Not your active consultation");
    db.update("UPDATE consultations SET completed_at=now(),notes=? WHERE id=(SELECT id FROM consultations WHERE patient_id=? AND doctor_id=? AND completed_at IS NULL ORDER BY started_at DESC LIMIT 1)",request.notes(),patientId,doctor);
    db.update("UPDATE patients SET status='COMPLETED' WHERE id=?",patientId);
    sup.audit("FINISH_CONSULTATION","PATIENT",patientId,"Consultation completed"); sup.notifyChange();
    return Map.of("message","Consultation completed");
  }
}
