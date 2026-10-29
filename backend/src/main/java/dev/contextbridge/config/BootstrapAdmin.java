package dev.contextbridge.config;
import java.util.UUID;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
@Component
public class BootstrapAdmin implements ApplicationRunner {
    private final JdbcClient db; private final PasswordEncoder passwords;
    private final String email,password,name;
    public BootstrapAdmin(JdbcClient db,PasswordEncoder passwords,@Value("${app.admin.email}") String email,
            @Value("${app.admin.password}") String password,@Value("${app.admin.name}") String name) {
        this.db=db;this.passwords=passwords;this.email=email.toLowerCase(java.util.Locale.ROOT);this.password=password;this.name=name;
    }
    @Override public void run(ApplicationArguments args) {
        if(db.sql("SELECT COUNT(*) FROM app_users").query(Long.class).single()>0) return;
        if(password.length()<16 || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72) throw new IllegalStateException("Define ADMIN_PASSWORD con al menos 16 caracteres y como máximo 72 bytes UTF-8 para crear el administrador inicial.");
        db.sql("INSERT INTO app_users(id,email,display_name,password_hash) VALUES(:id,:email,:name,:password)")
            .param("id",UUID.randomUUID()).param("email",email).param("name",name).param("password",passwords.encode(password)).update();
    }
}
