plugins {
    java
    id("org.springframework.boot") version "4.1.2"
    id("io.spring.dependency-management") version "1.1.7"
}
group = "dev.contextbridge"
version = "0.1.0"
java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }
repositories { mavenCentral() }
dependencyManagement { imports { mavenBom("org.springframework.ai:spring-ai-bom:2.0.2") } }
dependencies {
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-jdbc")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.springframework.ai:spring-ai-starter-mcp-server-webmvc")
    runtimeOnly("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("org.postgresql:postgresql")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.springframework.boot:spring-boot-starter-security-test")
    testImplementation("org.springframework.boot:spring-boot-starter-jdbc-test")
    testImplementation("org.testcontainers:postgresql:1.21.3")
    testImplementation("org.testcontainers:junit-jupiter:1.21.3")
    testRuntimeOnly("com.h2database:h2")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
tasks.withType<JavaCompile>().configureEach { options.compilerArgs.add("-parameters") }
tasks.withType<Test>().configureEach { useJUnitPlatform() }
tasks.bootJar { archiveFileName.set("context-bridge.jar") }

tasks.test { useJUnitPlatform { excludeTags("integration") } }
tasks.register<Test>("integrationTest") {
    description = "Runs the PostgreSQL 18 contract tests using Docker."
    group = "verification"
    testClassesDirs = sourceSets.test.get().output.classesDirs
    classpath = sourceSets.test.get().runtimeClasspath
    useJUnitPlatform { includeTags("integration") }
    shouldRunAfter(tasks.test)
}

// Only bootRun loads the private local environment. Production uses Docker env vars.
tasks.bootRun {
    val envFile = rootProject.file(".env")
    if (envFile.exists()) {
        envFile.readLines().filter { it.isNotBlank() && !it.trimStart().startsWith("#") && it.contains("=") }
            .forEach { line ->
                val (key, value) = line.split("=", limit = 2)
                environment(key.trim(), value.trim())
            }
    }
}
