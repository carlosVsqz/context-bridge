package dev.contextbridge;
import dev.contextbridge.context.*;
import dev.contextbridge.context.Models.*;
import dev.contextbridge.security.TokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockHttpSession;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest(properties={
    "spring.datasource.url=jdbc:h2:mem:security;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "app.admin.password=only-for-tests-strong-password"
})
@AutoConfigureMockMvc
class SecurityFlowTest {
    @Autowired MockMvc mvc;
    @Autowired ContextService contexts;
    @Autowired TokenService tokens;
    @Test void requiresLoginAndCsrfAndAuthenticatesRealPassword() throws Exception {
        mvc.perform(get("/api/projects")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").param("email","admin@contextbridge.local").param("password","only-for-tests-strong-password")).andExpect(status().isForbidden());
        var result=mvc.perform(post("/api/auth/login").with(csrf()).param("email","admin@contextbridge.local").param("password","only-for-tests-strong-password"))
            .andExpect(status().isOk()).andReturn();
        var session=(MockHttpSession)result.getRequest().getSession(false);
        mvc.perform(get("/api/auth/me").session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.email").value("admin@contextbridge.local"));
        mvc.perform(post("/api/projects").session(session).contentType("application/json").content("{}"))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/login").with(csrf()).param("email","admin@contextbridge.local").param("password","wrong"))
            .andExpect(status().isUnauthorized());
    }
    @Test void mcpHasIndependentBearerAuthenticationAndProjectScope() throws Exception {
        mvc.perform(post("/mcp").contentType("application/json").content("{}"))
            .andExpect(status().isUnauthorized());
        mvc.perform(post("/mcp").with(user("admin").roles("ADMIN")).contentType("application/json").content("{}"))
            .andExpect(status().isUnauthorized());
        var a=contexts.create(new CreateProject("a-"+UUID.randomUUID(),"Project Alpha","",""));
        var b=contexts.create(new CreateProject("b-"+UUID.randomUUID(),"Project Secret Beta","",""));
        var credential=tokens.create(new TokenService.CreateToken(a.id(),"read-only","READ",30));
        var read=mcp(credential.secret(),"get_project_context","{}");
        assertThat(read).contains("Project Alpha").doesNotContain("Project Secret Beta");
        var denied=mcp(credential.secret(),"save_checkpoint","{\"kind\":\"CHECKPOINT\",\"title\":\"Forbidden\",\"content\":\"Should not persist\",\"environment\":\"test\",\"branch\":\"main\",\"gitCommit\":\"\",\"expectedRevision\":0,\"requestId\":\""+UUID.randomUUID()+"\"}");
        assertThat(denied).contains("isError").contains("true");
        assertThat(contexts.context(a.id(),10,null).entries()).isEmpty();
        tokens.revoke(credential.token().id());
        mvc.perform(post("/mcp").header("Authorization","Bearer "+credential.secret()).contentType("application/json").content("{}"))
            .andExpect(status().isUnauthorized());
    }
    @Test void mcpWritesUseTheSamePersistentHistoryAsTheConsole() throws Exception {
        var p=contexts.create(new CreateProject("write-"+UUID.randomUUID(),"Writable project","",""));
        var token=tokens.create(new TokenService.CreateToken(p.id(),"desktop","WRITE",30));
        var result=mcp(token.secret(),"save_checkpoint","{\"kind\":\"DECISION\",\"title\":\"Use PostgreSQL\",\"content\":\"Shared memory across IDEs\",\"environment\":\"desktop\",\"branch\":\"main\",\"gitCommit\":\"abc123\",\"expectedRevision\":0,\"requestId\":\""+UUID.randomUUID()+"\"}");
        assertThat(result).contains("Use PostgreSQL");
        assertThat(contexts.context(p.id(),10,null).entries().getFirst().environment()).isEqualTo("desktop");
    }
    @Test void discoversToolsOverTheJetBrainsCompatibleProtocol() throws Exception {
        var project=contexts.create(new CreateProject("discovery-"+UUID.randomUUID(),"Discovery","",""));
        var token=tokens.create(new TokenService.CreateToken(project.id(),"ide","WRITE",30));
        var initialize=mvc.perform(post("/mcp").header("Authorization","Bearer "+token.secret())
            .contentType("application/json").accept("application/json","text/event-stream")
            .content("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2025-11-25\",\"capabilities\":{},\"clientInfo\":{\"name\":\"jetbrains-test\",\"version\":\"1.0\"}}}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(initialize).contains("context-bridge").contains("protocolVersion");
        var tools=mvc.perform(post("/mcp").header("Authorization","Bearer "+token.secret())
            .header("MCP-Protocol-Version","2025-11-25").contentType("application/json").accept("application/json","text/event-stream")
            .content("{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/list\",\"params\":{}}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(tools).contains("get_project_context","search_project_context","save_checkpoint").doesNotContain("McpTransportContext");
        mvc.perform(post("/mcp").header("Authorization","Bearer "+token.secret()).header("Origin","https://other.example")
            .contentType("application/json").content("{}"))
            .andExpect(status().isForbidden());
    }
    String mcp(String token,String tool,String args) throws Exception {
        return mvc.perform(post("/mcp").header("Authorization","Bearer "+token)
            .header("MCP-Protocol-Version","2025-11-25").accept("application/json","text/event-stream")
            .contentType("application/json").content("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\""+tool+"\",\"arguments\":"+args+"}}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }
}
