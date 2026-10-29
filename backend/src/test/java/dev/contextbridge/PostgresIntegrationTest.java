package dev.contextbridge;
import org.junit.jupiter.api.Tag;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
@Tag("integration")
@Testcontainers
@SpringBootTest(properties="app.admin.password=only-for-tests-strong-password")
class PostgresIntegrationTest extends MemoryContract {
    @Container static final PostgreSQLContainer<?> postgres=new PostgreSQLContainer<>("postgres:18.6-alpine");
    @DynamicPropertySource static void database(DynamicPropertyRegistry p) {
        p.add("spring.datasource.url",postgres::getJdbcUrl);
        p.add("spring.datasource.username",postgres::getUsername);
        p.add("spring.datasource.password",postgres::getPassword);
    }
}
