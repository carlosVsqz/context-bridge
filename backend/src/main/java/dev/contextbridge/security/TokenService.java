package dev.contextbridge.security;

import dev.contextbridge.context.ContextService;
import dev.contextbridge.web.ApiException;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;

@Service
public class TokenService {
    private final JdbcClient db;
    private final ContextService contexts;
    public TokenService(JdbcClient db,ContextService contexts) { this.db=db; this.contexts=contexts; }
    public record TokenInfo(UUID id,UUID projectId,String name,String prefix,String permission,Instant expiresAt,Instant revokedAt,Instant lastUsedAt,Instant createdAt) {}
    public record NewToken(TokenInfo token,String secret) {}
    public record TokenPrincipal(UUID tokenId,UUID projectId,String name,String permission) {}
    public record CreateToken(@NotNull UUID projectId,@NotBlank @Size(max=100) String name,
                              @NotNull @Pattern(regexp="READ|WRITE") String permission,@Min(1) @Max(365) int expiresInDays) {}
    private static final java.security.SecureRandom RANDOM=new java.security.SecureRandom();
    private static Instant nullable(java.sql.ResultSet r,String key) throws java.sql.SQLException {
        Timestamp t=r.getTimestamp(key); return t==null?null:t.toInstant();
    }
    static final org.springframework.jdbc.core.RowMapper<TokenInfo> MAPPER=(r,n)->new TokenInfo(r.getObject("id",UUID.class),r.getObject("project_id",UUID.class),r.getString("name"),r.getString("prefix"),r.getString("permission"),nullable(r,"expires_at"),nullable(r,"revoked_at"),nullable(r,"last_used_at"),nullable(r,"created_at"));
    public List<TokenInfo> list() { return db.sql("SELECT * FROM api_tokens ORDER BY created_at DESC LIMIT 500").query(MAPPER).list(); }
    public NewToken create(CreateToken c) {
        contexts.project(c.projectId());
        byte[] bytes=new byte[32]; RANDOM.nextBytes(bytes);
        String raw="cb_"+Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        UUID id=UUID.randomUUID();
        db.sql("INSERT INTO api_tokens(id,project_id,name,prefix,token_hash,permission,expires_at) VALUES(:id,:project,:name,:prefix,:hash,:permission,:expires)")
            .param("id",id).param("project",c.projectId()).param("name",c.name()).param("prefix",raw.substring(0,11))
            .param("hash",hash(raw)).param("permission",c.permission()).param("expires",Timestamp.from(Instant.now().plus(Duration.ofDays(c.expiresInDays())))).update();
        return new NewToken(db.sql("SELECT * FROM api_tokens WHERE id=:id").param("id",id).query(MAPPER).single(),raw);
    }
    public void revoke(UUID id) {
        if(db.sql("UPDATE api_tokens SET revoked_at=CURRENT_TIMESTAMP WHERE id=:id AND revoked_at IS NULL").param("id",id).update()==0)
            throw ApiException.notFound();
    }
    public Optional<TokenPrincipal> authenticate(String raw) {
        if(raw==null || !raw.startsWith("cb_") || raw.length()!=46) return Optional.empty();
        var match=db.sql("SELECT * FROM api_tokens WHERE token_hash=:hash AND revoked_at IS NULL AND expires_at>CURRENT_TIMESTAMP")
            .param("hash",hash(raw)).query(MAPPER).optional();
        return match.map(t->{
            db.sql("UPDATE api_tokens SET last_used_at=CURRENT_TIMESTAMP WHERE id=:id").param("id",t.id()).update();
            return new TokenPrincipal(t.id(),t.projectId(),t.name(),t.permission());
        });
    }
    public static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch(NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    public static void requireWrite(TokenPrincipal p) {
        if(!"WRITE".equals(p.permission())) throw new ApiException(HttpStatus.FORBIDDEN,"READ_ONLY_TOKEN","Este token solo permite lectura.");
    }
}
