package dev.contextbridge.web;
import dev.contextbridge.context.*;
import dev.contextbridge.context.Models.*;
import dev.contextbridge.security.TokenService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.util.*;
@RestController
@RequestMapping("/api")
public class AdminController {
    private final ContextService contexts; private final TokenService tokens; private final JdbcClient db; private final PasswordEncoder passwords;
    public AdminController(ContextService contexts,TokenService tokens,JdbcClient db,PasswordEncoder passwords) {
        this.contexts=contexts;this.tokens=tokens;this.db=db;this.passwords=passwords;
    }
    @GetMapping("/auth/csrf") Object csrf(CsrfToken token) { return Map.of("token",token.getToken(),"headerName",token.getHeaderName()); }
    @GetMapping("/auth/me") Object me(Authentication a) {
        return db.sql("SELECT email,display_name FROM app_users WHERE email=:email").param("email",a.getName())
            .query((r,n)->Map.of("email",r.getString("email"),"name",r.getString("display_name"))).single();
    }
    public record ChangePassword(@NotBlank String currentPassword,@Size(min=16,max=72) @NotNull String newPassword) {}
    @PostMapping("/auth/password") @ResponseStatus(HttpStatus.NO_CONTENT)
    void password(@Valid @RequestBody ChangePassword body,Authentication a) {
        if(body.newPassword().getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72)
            throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_PASSWORD","La nueva contraseña no puede superar 72 bytes UTF-8.");
        String hash=db.sql("SELECT password_hash FROM app_users WHERE email=:email").param("email",a.getName()).query(String.class).single();
        if(!passwords.matches(body.currentPassword(),hash)) throw new ApiException(HttpStatus.BAD_REQUEST,"INVALID_PASSWORD","La contraseña actual es incorrecta.");
        db.sql("UPDATE app_users SET password_hash=:hash WHERE email=:email").param("hash",passwords.encode(body.newPassword())).param("email",a.getName()).update();
    }
    @GetMapping("/projects") Object projects() { return contexts.projects(); }
    @PostMapping("/projects") @ResponseStatus(HttpStatus.CREATED) Object create(@Valid @RequestBody CreateProject p) { return contexts.create(p); }
    @PutMapping("/projects/{id}") Object update(@PathVariable UUID id,@Valid @RequestBody UpdateProject p) { return contexts.update(id,p); }
    @GetMapping("/projects/{id}/context") Object context(@PathVariable UUID id,@RequestParam(defaultValue="30") int limit,@RequestParam(required=false) Long before) { return contexts.context(id,limit,before); }
    @GetMapping("/projects/{id}/entries") Object entries(@PathVariable UUID id,@RequestParam(defaultValue="") @Size(max=200) String q,@RequestParam(defaultValue="30") int limit,@RequestParam(required=false) Long before) {
        contexts.project(id);return contexts.entries(id,q,limit,before);
    }
    @PostMapping("/projects/{id}/entries") @ResponseStatus(HttpStatus.CREATED)
    Object append(@PathVariable UUID id,@Valid @RequestBody CreateEntry e,Authentication a) { return contexts.append(id,e,a.getName()); }
    @GetMapping("/activity") Object activity() { return contexts.recent(); }
    @GetMapping("/tokens") Object tokens() { return tokens.list(); }
    @PostMapping("/tokens") @ResponseStatus(HttpStatus.CREATED) Object token(@Valid @RequestBody TokenService.CreateToken c) { return tokens.create(c); }
    @DeleteMapping("/tokens/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void revoke(@PathVariable UUID id) { tokens.revoke(id); }
}
