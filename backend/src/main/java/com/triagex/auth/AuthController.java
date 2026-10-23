package com.triagex.auth;
import com.triagex.core.Support;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController @RequestMapping("/api/auth")
public class AuthController {
  private final JdbcTemplate db; private final PasswordEncoder encoder; private final AuthenticationManager auth; private final Support sup;
  public AuthController(JdbcTemplate db,PasswordEncoder encoder,AuthenticationManager auth,Support sup){this.db=db;this.encoder=encoder;this.auth=auth;this.sup=sup;}
  public record Signup(
        @NotBlank String name,
        @Email @NotBlank String email,
        @Size(min=12) String password,
        @NotBlank String role,
        String doctorGrade
) {}
  public record Login(String email,String password){}
  @GetMapping("/csrf") public Map<String,String> csrf(CsrfToken token) { return Map.of("token",token.getToken()); }
  @PostMapping("/signup") @Transactional public Map<String,Object> signup(@Valid @RequestBody Signup s) {
    String role=s.role().toUpperCase();
    if(!Set.of("PATIENT","DOCTOR","NURSE").contains(role)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid signup role");
    if(db.queryForObject("SELECT COUNT(*) FROM users WHERE email=?",Long.class,s.email().toLowerCase())>0) throw new ResponseStatusException(HttpStatus.CONFLICT,"Email already registered");
    String doctorGrade = null;

if ("DOCTOR".equals(role)) {

    doctorGrade = s.doctorGrade() == null
            || s.doctorGrade().isBlank()
            ? "JUNIOR"
            : s.doctorGrade().trim().toUpperCase();

    sup.require(
            Set.of("SENIOR", "JUNIOR").contains(doctorGrade),
            "Invalid doctor designation"
    );
}
    boolean approved=true;
    db.update(
    "INSERT INTO users(full_name,email,password_hash,role,approved,doctor_grade) VALUES(?,?,?,?,?,?)",
    s.name().trim(),
    s.email().trim().toLowerCase(),
    encoder.encode(s.password()),
    role,
    approved,
    doctorGrade
);
    db.update("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,detail) VALUES(NULL,'SELF_REGISTER','USER',?,?)",db.queryForObject("SELECT id FROM users WHERE email=?",Long.class,s.email().trim().toLowerCase()),"New "+role+" account created");
    sup.notifyChange();
    return Map.of("message","Account created. You can sign in now.","approved",true);
  }
  @PostMapping("/login") public Map<String,Object> login(@RequestBody Login request,HttpServletRequest req,HttpServletResponse res){
    String email=request.email()==null?"":request.email().trim().toLowerCase();
    var status=db.queryForList("SELECT approved,enabled,role FROM users WHERE email=?",email);
    if(!status.isEmpty() && "RECEPTIONIST".equals(status.get(0).get("role"))) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Receptionist accounts are no longer supported. Contact an administrator.");
    if(!status.isEmpty() && !(Boolean)status.get(0).get("approved")) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Account pending administrator approval");
    try {
      var authenticated=auth.authenticate(new UsernamePasswordAuthenticationToken(email,request.password()));
      var context=SecurityContextHolder.createEmptyContext(); context.setAuthentication(authenticated);
      SecurityContextHolder.setContext(context);
      req.getSession(true); req.changeSessionId();
      new HttpSessionSecurityContextRepository().saveContext(context,req,res);
      return me();
    } catch(org.springframework.security.core.AuthenticationException e) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Invalid email or password"); }
  }
  @GetMapping("/me") public Map<String,Object> me(){
    var items=db.queryForList("SELECT id,full_name AS name,email,role,approved,doctor_grade AS \"doctorGrade\" FROM users WHERE id=?",sup.userId());
    return items.get(0);
  }
}
