package com.triagex.triage;
import com.triagex.core.Support;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController @RequestMapping("/api/triage")
@PreAuthorize("hasRole('NURSE')")
public class TriageController {
  private final JdbcTemplate db;
private final Support sup;
private final AiExplanationService ai;

public TriageController(
        JdbcTemplate db,
        Support sup,
        AiExplanationService ai) {

    this.db = db;
    this.sup = sup;
    this.ai = ai;
}
  public record Assessment(long patientId,Integer heartRate,Double spo2,Double temperature,Integer systolic,Integer diastolic,Integer respiratoryRate,Integer pain,String notes){}
  public record Confirmation(String priority,String reason){}
  @PostMapping("/assess") public Map<String,Object> assess(@RequestBody Assessment a){
    var matches=db.queryForList("SELECT * FROM patients WHERE id=?",a.patientId());
    if(matches.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Patient not found");
    sup.require(a.heartRate()==null || (a.heartRate()>=0 && a.heartRate()<=260),"Heart rate must be 0–260");
    sup.require(a.respiratoryRate()==null || (a.respiratoryRate()>=0 && a.respiratoryRate()<=100),"Respiratory rate must be 0–100");
    sup.require(a.temperature()==null || (a.temperature()>=25 && a.temperature()<=45),"Temperature must be in °C (25–45)");
    sup.require(a.systolic()==null || (a.systolic()>=0 && a.systolic()<=350),"Systolic must be 0–350");
    sup.require(a.diastolic()==null || (a.diastolic()>=0 && a.diastolic()<=250),"Diastolic must be 0–250");
    sup.require(a.pain()==null || (a.pain()>=0 && a.pain()<=10),"Pain score must be 0–10");
    sup.require(a.spo2()==null || (a.spo2()>=0 && a.spo2()<=100),"SpO2 must be 0–100");
    String reported=((String)matches.get(0).get("complaint")+" "+Objects.toString(matches.get(0).get("symptoms"),"")).toLowerCase();
    TriageRules.Decision decision=TriageRules.evaluate(reported,a.spo2(),a.heartRate(),a.temperature(),a.pain());
    String recommendation=decision.recommended();
    List<String> flags=decision.flags();
    Long id=db.queryForObject("INSERT INTO assessments(patient_id,heart_rate,spo2,temperature,systolic,diastolic,respiratory_rate,pain,notes,recommended,flags) VALUES(?,?,?,?,?,?,?,?,?,?,?) RETURNING id",Long.class,a.patientId(),a.heartRate(),a.spo2(),a.temperature(),a.systolic(),a.diastolic(),a.respiratoryRate(),a.pain(),a.notes(),recommendation,String.join(" | ",flags));
    sup.audit("CREATE_ASSESSMENT","PATIENT",a.patientId(),"Assessment "+id+" provisional "+recommendation); sup.notifyChange();
    return db.queryForList("SELECT * FROM assessments WHERE id=?",id).get(0);
  }
  @PostMapping("/{id}/explain")
public Map<String, String> explain(
        @PathVariable long id) {

    var rows = db.queryForList(
            "SELECT recommended, flags FROM assessments WHERE id=?",
            id
    );

    if (rows.isEmpty()) {
        throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Assessment not found"
        );
    }

    var assessment = rows.get(0);

    String priority = Objects.toString(
            assessment.get("recommended"), "NORMAL");

    String flags = Objects.toString(
            assessment.get("flags"), "");

    try {

        String explanation =
                ai.generateExplanation(priority, flags);

        return Map.of(
                "explanation", explanation,
                "source", "AI"
        );

    } catch (Exception e) {

        System.err.println(
                "AI explanation unavailable: " +
                e.getMessage());

        String fallback = flags.isBlank()
                ? "The system recommended " + priority +
                  " because no configured warning rule was triggered. " +
                  "Nurse review is required."
                : "The system recommended " + priority +
                  " because: " +
                  flags.replace(" | ", "; ") +
                  ". Nurse review is required.";

        return Map.of(
                "explanation", fallback,
                "source", "RULES"
        );
    }
}
  @PostMapping("/{id}/confirm") public Map<String,String> confirm(@PathVariable long id,@RequestBody Confirmation req) {
    sup.require(Set.of("CRITICAL","URGENT","NORMAL").contains(req.priority()),"Invalid priority");
    var rows=db.queryForList("SELECT patient_id,recommended,confirmed FROM assessments WHERE id=?",id);
    if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Assessment not found");
    var row=rows.get(0);
    sup.require(row.get("confirmed")==null,"Assessment already confirmed");
    String recommendation=(String)row.get("recommended");
    if(!recommendation.equals(req.priority())) sup.require(req.reason()!=null && req.reason().trim().length()>=8,"Give a reason for overriding the recommendation");
    long patient=((Number)row.get("patient_id")).longValue();
    db.update("UPDATE assessments SET confirmed=?, reviewed_by=?,override_reason=?,confirmed_at=now() WHERE id=?",req.priority(),sup.userId(),req.reason(),id);
    db.update("INSERT INTO queue_entries(patient_id,priority,status) VALUES(?,?,'WAITING') ON CONFLICT(patient_id) DO UPDATE SET priority=EXCLUDED.priority WHERE queue_entries.status='WAITING'",patient,req.priority());
    db.update("UPDATE patients SET status='WAITING' WHERE id=? AND status <> 'IN_CONSULTATION' AND status <> 'COMPLETED'",patient);
    sup.audit("CONFIRM_PRIORITY","PATIENT",patient,recommendation+" -> "+req.priority()+" "+Objects.toString(req.reason(),"")); sup.notifyChange();
    return Map.of("message","Priority confirmed; queue updated");
  }
}
