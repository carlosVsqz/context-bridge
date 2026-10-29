package dev.contextbridge;
import org.springframework.boot.test.context.SpringBootTest;
@SpringBootTest(properties={
    "spring.datasource.url=jdbc:h2:mem:memory;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=",
    "app.admin.password=only-for-tests-strong-password"
})
class MemoryServiceTest extends MemoryContract {}
