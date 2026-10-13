package com.triagex.core;

import java.util.Map;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@Component
public class Support {
  private final JdbcTemplate db;
  private final SimpMessagingTemplate events;
  public Support(JdbcTemplate db, SimpMessagingTemplate events) { this.db=db; this.events=events; }
  public long userId() {
    Authentication a = SecurityContextHolder.getContext().getAuthentication();
    if (a == null || !a.isAuthenticated()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    var ids=db.queryForList("SELECT id FROM users WHERE email=?",a.getName());
    if(ids.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
    return ((Number)ids.get(0).get("id")).longValue();
  }
  public String role() { return db.queryForObject("SELECT role FROM users WHERE id=?",String.class,userId()); }
  public void notifyChange() { events.convertAndSend("/topic/changes",Map.of("event","REFRESH")); }
  public void audit(String action,String entity,long entityId,String detail) {
    db.update("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,detail) VALUES(?,?,?,?,?)",userId(),action,entity,entityId,detail);
  }
  public void require(boolean condition,String message) { if (!condition) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
  public void canViewPatient(long patientId) {
    String role=role();
    if (!Objects.equals(role,"PATIENT")) return;
    // Patient-facing account linking intentionally not enabled in prototype.
    throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Patient account linking is not enabled");
  }
}

@RestControllerAdvice
class ApiErrorHandler {
  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<Map<String,String>> status(ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode()).body(Map.of("error",e.getReason()==null?"Request failed":e.getReason()));
  }
  @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
  ResponseEntity<Map<String,String>> forbidden(Exception e) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error","Access denied: your role does not allow this action."));
  }
  @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
  ResponseEntity<Map<String,String>> validation(org.springframework.web.bind.MethodArgumentNotValidException e) {
    String detail=e.getBindingResult().getFieldErrors().stream().findFirst()
      .map(x -> x.getField()+": "+x.getDefaultMessage()).orElse("Invalid request");
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error",detail));
  }
  @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
  ResponseEntity<Map<String,String>> invalidJson(Exception e) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error","Invalid or missing request data."));
  }
  @ExceptionHandler({org.springframework.dao.DataAccessException.class})
  ResponseEntity<Map<String,String>> database(Exception e) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error","Database operation failed. Check required fields and uniqueness."));
  }
  @ExceptionHandler(Exception.class)
  ResponseEntity<Map<String,String>> generic(Exception e) {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error","Unexpected server error. See backend logs."));
  }
}
