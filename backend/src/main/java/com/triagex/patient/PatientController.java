package com.triagex.patient;
import com.triagex.core.Support;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.transaction.annotation.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController @RequestMapping("/api/patients")
@PreAuthorize("hasAnyRole('DOCTOR','NURSE')")
public class PatientController {
  private final JdbcTemplate db; private final Support sup; private final ObjectMapper json;
  public PatientController(JdbcTemplate db,Support sup,ObjectMapper json){this.db=db;this.sup=sup;this.json=json;}
  public record NewPatient(@NotBlank String name,@Min(0) @Max(125) int age,String sex,String phone,@NotBlank String complaint,String symptoms,String medicalHistory,String allergies,String emergencyContact,Map<String,String> symptomSeverities,List<String> historyFlags){}
  @PostMapping @PreAuthorize("hasRole('NURSE')") @Transactional
  public Map<String,Object> create(@Valid @RequestBody NewPatient p) {
    String code="TX-"+UUID.randomUUID().toString().substring(0,8).toUpperCase();
    String symptomsJson;
    String historyJson;
    try {
      symptomsJson=json.writeValueAsString(p.symptomSeverities()==null ? Map.of() : p.symptomSeverities());
      historyJson=json.writeValueAsString(p.historyFlags()==null ? List.of() : p.historyFlags());
    } catch (com.fasterxml.jackson.core.JsonProcessingException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid intake options"); }
    Long id=db.queryForObject("INSERT INTO patients(patient_code,name,age,sex,phone,complaint,symptoms,medical_history,allergies,emergency_contact,symptom_severities,history_flags,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?::jsonb,?::jsonb,?) RETURNING id",Long.class,code,p.name().trim(),p.age(),p.sex(),p.phone(),p.complaint().trim(),p.symptoms(),p.medicalHistory(),p.allergies(),p.emergencyContact(),symptomsJson,historyJson,sup.userId());
    sup.audit("REGISTER_PATIENT","PATIENT",id,"New patient registered"); sup.notifyChange();
    return detail(id);
  }
  @GetMapping public Object list(@RequestParam(defaultValue="") String q){
    String search="%"+q.trim()+"%";
    return db.queryForList("SELECT p.id,p.patient_code,p.name,p.age,p.sex,p.complaint,p.status,p.created_at,q.priority,q.status AS queue_status FROM patients p LEFT JOIN queue_entries q ON q.patient_id=p.id WHERE p.name ILIKE ? OR p.patient_code ILIKE ? ORDER BY p.created_at DESC LIMIT 300",search,search);
  }
  @GetMapping("/{id}") public Map<String,Object> detail(@PathVariable long id) {
    var rows=db.queryForList("SELECT * FROM patients WHERE id=?",id);
    if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Patient not found");
    Map<String,Object> response=new LinkedHashMap<>(rows.get(0));
    response.put("assessments",db.queryForList("SELECT a.*,u.full_name AS reviewer_name FROM assessments a LEFT JOIN users u ON a.reviewed_by=u.id WHERE patient_id=? ORDER BY created_at DESC",id));
    response.put("consultations",db.queryForList("SELECT c.*,u.full_name AS doctor_name FROM consultations c JOIN users u ON u.id=c.doctor_id WHERE patient_id=? ORDER BY started_at DESC",id));
    return response;
  }
}
