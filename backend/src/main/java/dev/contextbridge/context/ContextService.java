package dev.contextbridge.context;

import dev.contextbridge.web.ApiException;
import dev.contextbridge.context.Models.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.*;

@Service
public class ContextService {
    private final JdbcClient db;
    public ContextService(JdbcClient db) { this.db=db; }
    private static Instant instant(ResultSet r, String key) throws SQLException { return r.getTimestamp(key).toInstant(); }
    static final RowMapper<Project> PROJECT=(r,n)->new Project(r.getObject("id",UUID.class),r.getString("slug"),
        r.getString("name"),r.getString("description"),r.getString("repository_url"),r.getString("summary"),
        r.getLong("revision"),instant(r,"created_at"),instant(r,"updated_at"));
    static final RowMapper<Entry> ENTRY=(r,n)->new Entry(r.getObject("id",UUID.class),r.getObject("project_id",UUID.class),
        r.getString("kind"),r.getString("title"),r.getString("content"),r.getString("environment"),r.getString("branch"),
        r.getString("git_commit"),r.getString("author"),r.getLong("revision"),r.getObject("request_id",UUID.class),instant(r,"created_at"));
    public List<Project> projects() {
        return db.sql("SELECT * FROM projects ORDER BY updated_at DESC LIMIT 200").query(PROJECT).list();
    }
    public Project project(UUID id) {
        return db.sql("SELECT * FROM projects WHERE id=:id").param("id",id).query(PROJECT).optional().orElseThrow(ApiException::notFound);
    }
    @Transactional
    public Project create(CreateProject c) {
        UUID id=UUID.randomUUID();
        db.sql("INSERT INTO projects(id,slug,name,description,repository_url) VALUES(:id,:slug,:name,:description,:repo)")
            .param("id",id).param("slug",c.slug()).param("name",c.name().strip()).param("description",c.description())
            .param("repo",c.repositoryUrl()).update();
        return project(id);
    }
    @Transactional
    public Project update(UUID id, UpdateProject c) {
        checkRevision(lock(id),c.expectedRevision());
        db.sql("UPDATE projects SET name=:name, description=:description, repository_url=:repo, summary=:summary, revision=revision+1, updated_at=CURRENT_TIMESTAMP WHERE id=:id")
            .param("id",id).param("name",c.name().strip()).param("description",c.description()).param("repo",c.repositoryUrl()).param("summary",c.summary()).update();
        // Keep a durable snapshot of every summary change as part of the same transaction.
        insert(id,new CreateEntry("NOTE","Contexto del proyecto actualizado",c.summary().isBlank()?"Sin resumen.":c.summary(),"consola","","",c.expectedRevision(),UUID.randomUUID()),"admin",c.expectedRevision()+1);
        return project(id);
    }
    private Project lock(UUID id) {
        return db.sql("SELECT * FROM projects WHERE id=:id FOR UPDATE").param("id",id).query(PROJECT).optional().orElseThrow(ApiException::notFound);
    }
    private void checkRevision(Project p,long expected) {
        if(p.revision()!=expected) throw new ApiException(HttpStatus.CONFLICT,"REVISION_CONFLICT",
            "El proyecto cambió en otro entorno. Recarga el contexto y vuelve a intentarlo. Revisión actual: "+p.revision());
    }
    @Transactional
    public Entry append(UUID id,CreateEntry c,String author) {
        Project p=lock(id);
        Optional<Entry> existing=db.sql("SELECT * FROM context_entries WHERE project_id=:id AND request_id=:request")
            .param("id",id).param("request",c.requestId()).query(ENTRY).optional();
        if(existing.isPresent()) {
            Entry e=existing.get();
            if(!e.kind().equals(c.kind()) || !e.title().equals(c.title().strip()) || !e.content().equals(c.content())
                || !e.environment().equals(c.environment()) || !e.branch().equals(c.branch()) || !e.gitCommit().equals(c.gitCommit()))
                throw new ApiException(HttpStatus.CONFLICT,"IDEMPOTENCY_CONFLICT","requestId ya se utilizó con otros datos.");
            return e;
        }
        checkRevision(p,c.expectedRevision());
        long next=p.revision()+1;
        Entry e=insert(id,c,author,next);
        db.sql("UPDATE projects SET revision=:rev, updated_at=CURRENT_TIMESTAMP WHERE id=:id")
            .param("rev",next).param("id",id).update();
        return e;
    }
    private Entry insert(UUID id,CreateEntry c,String author,long revision) {
        UUID entryId=UUID.randomUUID();
        db.sql("INSERT INTO context_entries(id,project_id,kind,title,content,environment,branch,git_commit,author,revision,request_id) VALUES(:entry,:project,:kind,:title,:content,:env,:branch,:commit,:author,:revision,:request)")
            .param("entry",entryId).param("project",id).param("kind",c.kind()).param("title",c.title().strip()).param("content",c.content())
            .param("env",c.environment()).param("branch",c.branch()).param("commit",c.gitCommit()).param("author",author)
            .param("revision",revision).param("request",c.requestId()).update();
        return db.sql("SELECT * FROM context_entries WHERE id=:id").param("id",entryId).query(ENTRY).single();
    }
    @Transactional(readOnly=true, isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public ProjectContext context(UUID id,int limit,Long before) {
        Project p=project(id);
        List<Entry> entries=entries(id,"",limit,before);
        String cursor=entries.size()==Math.clamp(limit,1,100)?Long.toString(entries.getLast().revision()):null;
        return new ProjectContext(p,entries,cursor);
    }
    public List<Entry> entries(UUID id,String query,int limit,Long before) {
        String escaped=query.toLowerCase(Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_");
        return db.sql("SELECT * FROM context_entries WHERE project_id=:id AND revision<:before AND (LOWER(title) LIKE :query ESCAPE '!' OR LOWER(content) LIKE :query ESCAPE '!') ORDER BY revision DESC LIMIT :limit")
            .param("id",id).param("before",before==null?Long.MAX_VALUE:before).param("query","%"+escaped+"%")
            .param("limit",Math.clamp(limit,1,100)).query(ENTRY).list();
    }
    public List<Entry> recent() { return db.sql("SELECT * FROM context_entries ORDER BY created_at DESC LIMIT 30").query(ENTRY).list(); }
}
