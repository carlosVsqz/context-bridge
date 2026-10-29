package dev.contextbridge;

import dev.contextbridge.context.*;
import dev.contextbridge.context.Models.*;
import dev.contextbridge.security.TokenService;
import dev.contextbridge.web.ApiException;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.UUID;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

abstract class MemoryContract {
    @Autowired ContextService contexts;
    @Autowired TokenService tokens;
    Project createProject() {
        String slug="test-"+UUID.randomUUID();
        return contexts.create(new CreateProject(slug,"Contrato de memoria","Proyecto de prueba",""));
    }
    CreateEntry entry(long revision,UUID request,String text) {
        return new CreateEntry("CHECKPOINT","  Avance  ",text,"equipo-a","feature/memory","abc123",revision,request);
    }
    @Test void detectsStaleEnvironmentAndMakesRetriesIdempotent() {
        Project p=createProject(); UUID request=UUID.randomUUID();
        var saved=contexts.append(p.id(),entry(0,request,"Primera entrega"),"mcp:equipo-a");
        assertThat(saved.revision()).isEqualTo(1);
        assertThat(saved.title()).isEqualTo("Avance");
        assertThat(contexts.append(p.id(),entry(0,request,"Primera entrega"),"mcp:equipo-a").id()).isEqualTo(saved.id());
        assertThatThrownBy(()->contexts.append(p.id(),entry(0,UUID.randomUUID(),"Otro avance"),"mcp:equipo-b"))
            .isInstanceOfSatisfying(ApiException.class,e->assertThat(e.code).isEqualTo("REVISION_CONFLICT"));
        assertThat(contexts.context(p.id(),20,null).entries()).hasSize(1);
    }
    @Test void rejectsReusingRequestIdForDifferentData() {
        Project p=createProject(); UUID request=UUID.randomUUID();
        contexts.append(p.id(),entry(0,request,"Original"),"mcp:a");
        assertThatThrownBy(()->contexts.append(p.id(),entry(1,request,"Cambio"),"mcp:a"))
            .isInstanceOfSatisfying(ApiException.class,e->assertThat(e.code).isEqualTo("IDEMPOTENCY_CONFLICT"));
    }
    @Test void preservesSummaryHistoryAndSupportsRevisionPagination() {
        Project p=createProject();
        contexts.update(p.id(),new UpdateProject(p.name(),p.description(),"","Arquitectura inicial",0));
        contexts.append(p.id(),entry(1,UUID.randomUUID(),"Nueva entrega"),"mcp:a");
        var first=contexts.context(p.id(),1,null);
        assertThat(first.project().summary()).isEqualTo("Arquitectura inicial");
        assertThat(first.entries().getFirst().revision()).isEqualTo(2);
        var second=contexts.context(p.id(),1,Long.valueOf(first.nextCursor()));
        assertThat(second.entries().getFirst().content()).isEqualTo("Arquitectura inicial");
        assertThat(contexts.entries(p.id(),"%",20,null)).isEmpty();
        assertThat(contexts.entries(p.id(),"ARQUITECTURA",20,null)).hasSize(1);
    }
    @Test void onlyOneSimultaneousWriterCanAdvanceTheSameRevision() throws Exception {
        Project p=createProject(); var start=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)) {
            Callable<Boolean> writer=()->{start.await();try{contexts.append(p.id(),entry(0,UUID.randomUUID(),"Concurrente"),"mcp:a");return true;}catch(ApiException e){if(!e.code.equals("REVISION_CONFLICT"))throw e;return false;}};
            var a=pool.submit(writer);var b=pool.submit(writer);start.countDown();
            assertThat(java.util.List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder(true,false);
        }
        assertThat(contexts.context(p.id(),20,null).entries()).hasSize(1);
    }
    @Test void tokenScopesAndRevocationArePersistent() {
        Project a=createProject(),b=createProject();
        var credential=tokens.create(new TokenService.CreateToken(a.id(),"macbook","READ",30));
        var principal=tokens.authenticate(credential.secret()).orElseThrow();
        assertThat(principal.projectId()).isEqualTo(a.id()).isNotEqualTo(b.id());
        assertThatThrownBy(()->TokenService.requireWrite(principal)).isInstanceOf(ApiException.class);
        assertThat(tokens.authenticate("cb_invalid")).isEmpty();
        tokens.revoke(credential.token().id());
        assertThat(tokens.authenticate(credential.secret())).isEmpty();
    }
}
