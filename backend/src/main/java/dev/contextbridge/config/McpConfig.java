package dev.contextbridge.config;
import dev.contextbridge.security.BearerTokenFilter;
import io.modelcontextprotocol.json.jackson3.JacksonMcpJsonMapper;
import io.modelcontextprotocol.common.McpTransportContext;
import org.springframework.ai.mcp.server.webmvc.transport.WebMvcStatelessServerTransport;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.*;
import tools.jackson.databind.json.JsonMapper;
import java.util.Map;
@Configuration
public class McpConfig {
    @Bean WebMvcStatelessServerTransport webMvcStatelessServerTransport(@Qualifier("mcpServerJsonMapper") JsonMapper mapper) {
        return WebMvcStatelessServerTransport.builder()
            .jsonMapper(new JacksonMcpJsonMapper(mapper)).messageEndpoint("/mcp")
            .contextExtractor(request->McpTransportContext.create(Map.of(BearerTokenFilter.PRINCIPAL,
                request.servletRequest().getAttribute(BearerTokenFilter.PRINCIPAL))))
            .build();
    }
}
