# Verificación de esta entrega

Fecha: 29 de octubre de 2026.

| Comprobación | Resultado |
| --- | --- |
| Compilación Java 21 / Spring Boot 4.1.2 | Aprobada |
| Generación del JAR del backend | Aprobada |
| Backend: 5 pruebas de persistencia y concurrencia | Aprobadas con H2 en modo PostgreSQL |
| Backend: 4 pruebas HTTP de seguridad y MCP | Aprobadas con MockMvc |
| Consola: 3 pruebas de sesión/CSRF, conflictos y vigencia de tokens | Aprobadas con Vitest |
| TypeScript y compilación de producción con Vite | Aprobados |
| Sintaxis de Compose, override de desarrollo y workflow CI | Analizada correctamente como YAML |
| Generador de entorno | Verificados credenciales aleatorias, permisos 0600 y rechazo de sobrescritura |
| Servidor arrancado, login HTTP con cookies y CSRF | Aprobado |
| API administrativa: proyecto y token | Aprobada mediante HTTP real |
| MCP: initialize, tools/list y save_checkpoint | Aprobados mediante HTTP real, protocolo 2025-11-25 |
| SQL del esquema y persistencia por JDBC | Aprobados contra el motor PostgreSQL de PGlite |
| Docker build / Docker Compose completo | No ejecutados: este entorno no dispone de motor Docker |
| Contrato de integración con PostgreSQL 18 en Testcontainers | Implementado; pendiente de ejecutar con Docker |
| Codex dentro de un IDE JetBrains real | No ejecutado aquí; configuración revisada contra documentación oficial |
| Navegación visual completa en navegador | Pendiente: el servicio de preview no logró enlazar la consola con el backend Java |

## Alcance de la prueba HTTP

Se arrancó el JAR real y se comprobó el flujo de autenticación de Spring Security con una sesión y el token CSRF entregado por el propio servidor. Después se creó un proyecto, se generó un token, se inicializó un cliente MCP, se descubrieron las tres herramientas y se guardó un checkpoint que apareció por la API administrativa con revisión 1.

La base de esa comprobación fue **PGlite** (motor PostgreSQL ejecutado en WebAssembly, accesible por el protocolo PostgreSQL). El esquema SQL se aplicó previamente a esa base; Flyway se desactivó **solo en esa prueba temporal**, por las limitaciones de conexiones concurrentes de PGlite. PGlite y esa configuración no forman parte del proyecto entregado. La aplicación entregada usa PostgreSQL nativo y Flyway habilitado.

Las migraciones con Flyway se ejecutaron correctamente en las pruebas H2. Eso no sustituye la prueba de migraciones y bloqueo con PostgreSQL nativo: `:backend:integrationTest` la ejecuta mediante Docker y también está configurada en CI.

## Casos cubiertos por las pruebas incluidas

- Dos escritores con la misma revisión: solo uno puede avanzar.
- Rechazo de una escritura con revisión antigua.
- Reintento idempotente sin duplicar registros, incluso cuando el título se normaliza.
- Rechazo de un requestId reutilizado con contenido diferente.
- Historial de cambios al resumen y paginación por revisión.
- Búsqueda literal que escapa `%`, `_` y el carácter de escape.
- Tokens limitados al proyecto y revocación persistida.
- Login con contraseña real y bloqueo de escrituras sin CSRF.
- Una sesión administrativa no sustituye la credencial Bearer del MCP.
- El MCP de un proyecto no devuelve el contexto de otro.
- Un token READ no guarda avances.
- Descubrimiento MCP e inicialización con el protocolo usado en la prueba de compatibilidad.
- Rechazo de peticiones MCP con origen de navegador.
- Tokens revocados o vencidos no aparecen como conexiones vigentes en la consola.

## Ejecutar las comprobaciones pendientes

```bash
python3 scripts/init-env.py --email tu@correo.com
docker compose up --build -d
./gradlew :backend:integrationTest
```

Abre http://localhost:8080 y verifica el flujo de la consola. Después configura el mismo servidor en ambos JetBrains con un token por equipo, siguiendo el README.
