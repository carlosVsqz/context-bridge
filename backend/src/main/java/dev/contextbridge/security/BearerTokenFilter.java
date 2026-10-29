package dev.contextbridge.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;

public class BearerTokenFilter extends OncePerRequestFilter {
    public static final String PRINCIPAL = "contextbridge.token";
    private final TokenService tokens;

    public BearerTokenFilter(TokenService tokens) { this.tokens = tokens; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        // This endpoint serves IDE clients. Browser-origin MCP requests are rejected.
        if (request.getHeader("Origin") != null) {
            response.setStatus(403);
            return;
        }
        String header = request.getHeader("Authorization");
        var principal = tokens.authenticate(header != null && header.startsWith("Bearer ") ? header.substring(7) : null);
        if (principal.isEmpty()) {
            response.setStatus(401);
            response.setHeader("WWW-Authenticate", "Bearer realm=\"context-bridge\"");
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"code\":\"UNAUTHORIZED\",\"message\":\"Token inválido o vencido.\"}");
            return;
        }
        request.setAttribute(PRINCIPAL, principal.get());
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(principal.get(), null,
                List.of(new SimpleGrantedAuthority("ROLE_MCP"))));
        SecurityContextHolder.setContext(context);
        try {
            chain.doFilter(request, response);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
