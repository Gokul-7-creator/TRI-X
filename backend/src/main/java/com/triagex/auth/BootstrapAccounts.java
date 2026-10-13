package com.triagex.auth;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
@Component
public class BootstrapAccounts implements ApplicationRunner {
  private final JdbcTemplate db; private final PasswordEncoder encoder;
  @Value("${app.admin.email}") String email;
  @Value("${app.admin.password}") String password;
  @Value("${app.demo-users:false}") boolean demo;
  @Value("${DEMO_PASSWORD:}") String demoPassword;
  public BootstrapAccounts(JdbcTemplate db, PasswordEncoder encoder){this.db=db;this.encoder=encoder;}
  @Override public void run(ApplicationArguments args) {
    Long count=db.queryForObject("SELECT COUNT(*) FROM users WHERE role='ADMIN'",Long.class);
    if(count!=null && count==0) {
      if(password==null || password.length()<12 || password.startsWith("ReplaceWith"))
        throw new IllegalStateException("Set a strong ADMIN_PASSWORD (minimum 12 characters) in .env before first boot.");
      create("TRIAGE-X Administrator",email,"ADMIN",password);
    }
    if(demo) {
      if(demoPassword==null || demoPassword.length()<12) throw new IllegalStateException("SEED_DEMO_USERS=true requires DEMO_PASSWORD of at least 12 characters");
      create("Demo Doctor","doctor@triagex.local","DOCTOR",demoPassword);
      create("Demo Nurse","nurse@triagex.local","NURSE",demoPassword);
    }
  }
  private void create(String name,String email,String role,String pass) {
    db.update("INSERT INTO users(full_name,email,password_hash,role,approved) VALUES(?,?,?,?,true) ON CONFLICT(email) DO NOTHING",name,email.toLowerCase(),encoder.encode(pass),role);
  }
}
