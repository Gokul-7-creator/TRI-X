package com.triagex.config;

import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;

@Configuration
@EnableMethodSecurity
@EnableWebSocketMessageBroker
public class SecurityConfig implements WebSocketMessageBrokerConfigurer {
  @Bean PasswordEncoder encoder() { return new BCryptPasswordEncoder(); }
  @Bean UserDetailsService userDetails(JdbcTemplate db) {
    return username -> {
      var people = db.queryForList("SELECT email,password_hash,role,approved,enabled FROM users WHERE email = ?", username.toLowerCase());
      if (people.isEmpty()) throw new UsernameNotFoundException("Account not found");
      var p = people.get(0);
      return new User((String)p.get("email"), (String)p.get("password_hash"),
          (Boolean)p.get("enabled") && (Boolean)p.get("approved"), true,true,true,
          List.of(new SimpleGrantedAuthority("ROLE_" + p.get("role"))));
    };
  }
  @Bean AuthenticationManager authenticationManager(AuthenticationConfiguration cfg) throws Exception { return cfg.getAuthenticationManager(); }
  @Bean SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    return http
      .csrf(csrf -> csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()).csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
      .authorizeHttpRequests(auth -> auth
        .requestMatchers("/api/auth/login", "/api/auth/signup", "/api/auth/csrf", "/api/health").permitAll()
        .requestMatchers(HttpMethod.OPTIONS,"/**").permitAll()
        .requestMatchers("/api/**", "/ws/**").authenticated()
        .anyRequest().permitAll())
      .logout(logout -> logout.logoutUrl("/api/auth/logout").logoutSuccessHandler((req,res,auth)-> res.setStatus(204)))
      .build();
  }
  @Override public void registerStompEndpoints(StompEndpointRegistry registry) { registry.addEndpoint("/ws").setAllowedOriginPatterns("http://localhost:5173","http://127.0.0.1:5173"); }
  @Override public void configureMessageBroker(MessageBrokerRegistry registry) { registry.enableSimpleBroker("/topic"); registry.setApplicationDestinationPrefixes("/app"); }
}
