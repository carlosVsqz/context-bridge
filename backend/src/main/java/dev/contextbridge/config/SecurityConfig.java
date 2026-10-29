package dev.contextbridge.config;
import dev.contextbridge.security.*;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.*;
import org.springframework.http.HttpMethod;
import java.util.List;
@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }
    @Bean UserDetailsService users(JdbcClient db) {
        return username->db.sql("SELECT email,password_hash FROM app_users WHERE email=:email").param("email",username.toLowerCase(java.util.Locale.ROOT))
            .query((r,n)->User.withUsername(r.getString("email")).password(r.getString("password_hash")).roles("ADMIN").build())
            .optional().orElseThrow(()->new UsernameNotFoundException("Credenciales inválidas"));
    }
    @Bean @Order(1) SecurityFilterChain mcp(HttpSecurity http,TokenService tokens) throws Exception {
        return http.securityMatcher("/mcp","/mcp/**")
            .csrf(c->c.disable()).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .requestCache(c->c.disable())
            .authorizeHttpRequests(a->a.anyRequest().hasRole("MCP"))
            .addFilterBefore(new BearerTokenFilter(tokens),UsernamePasswordAuthenticationFilter.class)
            .build();
    }
    @Bean @Order(2) SecurityFilterChain console(HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(a->a.requestMatchers("/","/index.html","/assets/**","/favicon.svg","/api/auth/csrf","/api/auth/login","/actuator/health","/error").permitAll().anyRequest().hasRole("ADMIN"))
            .csrf(c->c.csrfTokenRepository(new HttpSessionCsrfTokenRepository()))
            .exceptionHandling(e->e.authenticationEntryPoint((req,res,ex)->{
                res.setStatus(401); res.setContentType("application/json"); res.getWriter().write("{\"code\":\"UNAUTHORIZED\",\"message\":\"Inicia sesión para continuar.\"}");
            }))
            .formLogin(f->f.loginProcessingUrl("/api/auth/login").usernameParameter("email").passwordParameter("password")
                .successHandler((req,res,auth)->{res.setStatus(200);res.setContentType("application/json");res.getWriter().write("{\"ok\":true}");})
                .failureHandler((req,res,ex)->{res.setStatus(401);res.setContentType("application/json");res.getWriter().write("{\"message\":\"Correo o contraseña incorrectos.\"}");}))
            .logout(l->l.logoutUrl("/api/auth/logout").deleteCookies("JSESSIONID").logoutSuccessHandler((req,res,auth)->res.setStatus(204)))
            .headers(h->h.contentSecurityPolicy(c->c.policyDirectives("default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")))
            .build();
    }
}
