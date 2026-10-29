# Context Bridge

Memoria compartida de proyectos para **Codex en JetBrains AI Assistant**. Una aplicación Spring Boot sirve la consola React, la API administrativa y el endpoint MCP. PostgreSQL conserva proyectos, resúmenes, decisiones y avances.

## Stack

| Área | Herramientas |
| --- | --- |
| Backend | Java 21 LTS, Spring Boot 4.1.2, Spring Security, Spring JDBC |
| MCP | Spring AI 2.0.2; Streamable HTTP sin estado en `/mcp` |
| Datos | PostgreSQL 18.6, migraciones Flyway |
| Consola | React 19.3.1, TypeScript 5.9, Vite 8.3.5, Lucide |
| Construcción | Gradle Wrapper 9.2.1, npm con lockfile, Docker multi-stage |
| Verificación | JUnit, Spring Security Test, Testcontainers, Vitest, GitHub Actions |

Se usan versiones estables y compatibles. No necesita una API key de OpenAI ni ejecutar un modelo: Codex es el cliente y este servidor conserva su contexto.

## Arranque completo con Docker

Requisitos: Docker Engine o Docker Desktop con Docker Compose v2. Python 3 solo se usa para generar `.env`; también puedes completarlo manualmente a partir de `.env.example`.

```bash
python3 scripts/init-env.py --email tu@correo.com
docker compose up --build -d
```

1. Abre **http://localhost:8080**.
2. Busca `ADMIN_EMAIL` y `ADMIN_PASSWORD` en tu `.env` privado e inicia sesión.
3. Crea un proyecto y agrega su resumen de arquitectura y objetivos.
4. En **Conexiones MCP**, crea un token para cada computadora.
5. Copia la configuración de conexión; el secreto se muestra solo una vez.

`init-env.py` genera contraseñas aleatorias y no sobrescribe un archivo existente. No hay una contraseña fija en el código. El administrador se crea **solo en una base vacía**. Cambiar `ADMIN_PASSWORD` después no cambia su contraseña; usa el botón de tu perfil en la consola.

```bash
docker compose ps
docker compose logs -f app
docker compose down
```

`down` conserva el volumen. `down -v` elimina la base y todos sus datos. PostgreSQL no expone un puerto al exterior en el despliegue normal. La aplicación escucha en la interfaz local por defecto.

## Usarlo desde dos equipos

Ejecuta **una sola instancia central** accesible desde ambos equipos. No levantes dos bases independientes si quieres compartir la misma memoria.

Para desplegarla en tu servidor o Dokploy:

- Usa el Dockerfile de la raíz y PostgreSQL de `compose.yaml`, con el volumen persistente indicado.
- Publica la aplicación a través de un reverse proxy con HTTPS. No publiques PostgreSQL.
- Configura `COOKIE_SECURE=true` para la consola HTTPS.
- Si tu proxy está fuera de la red de Compose y necesita el puerto publicado, ajusta `APP_BIND_ADDRESS` según tu red. Por defecto es `127.0.0.1`.
- El proxy debe limpiar/reconstruir `Forwarded` y `X-Forwarded-*` desde clientes externos. Spring usa estas cabeceras para resolver la URL pública.
- En ambos IDE usa la **misma URL HTTPS**, con tokens diferentes asignados al mismo proyecto.

Los chats no se copian entre equipos. Se comparte la información que guardas como contexto. Git sigue sincronizando el código, las ramas y los commits; los archivos sin commit no se transfieren por MCP.

## JetBrains + Codex

En una versión actual de IntelliJ IDEA, PyCharm, WebStorm u otro IDE con AI Assistant y Codex:

1. Abre **Settings → Tools → AI Assistant → Model Context Protocol (MCP)**.
2. Agrega una conexión HTTP con el JSON que devuelve la consola. Ejemplo en [`docs/jetbrains-mcp.example.json`](docs/jetbrains-mcp.example.json).
3. En **Tools → AI Assistant → Agents**, activa **Pass custom MCP servers**.
4. Abre una sesión de Codex y solicita: «Usa `get_project_context` del servidor Context Bridge y dime la revisión actual».
5. Copia las instrucciones de [`docs/AGENTS.project.example.md`](docs/AGENTS.project.example.md) al `AGENTS.md` de tu repositorio, integrándolas con sus reglas existentes.
6. Repite en el segundo equipo con otro token.

El MCP local integrado de JetBrains puede permanecer habilitado: ofrece herramientas del IDE. Context Bridge ofrece la memoria compartida del proyecto. Si el ajuste **Pass custom MCP servers** no aparece, actualiza el IDE/AI Assistant y revisa las restricciones de tu organización.

La integración de JetBrains se verificó contra su documentación oficial. No se ejecutó una instancia de IntelliJ en este entorno; la compatibilidad se comprueba adicionalmente a nivel del transporte y herramientas MCP con las pruebas incluidas.

### Herramientas expuestas

| Herramienta | Operación |
| --- | --- |
| `get_project_context` | Resumen, revisión, registros recientes y cursor para registros anteriores |
| `search_project_context` | Búsqueda literal sin distinción de mayúsculas en títulos y contenidos |
| `save_checkpoint` | Agrega un `CHECKPOINT`, una `DECISION` o una `NOTE`, con rama, commit y entorno |

El proyecto se obtiene del token, **no** de un `projectId` enviado por el modelo. Los tokens `READ` no pueden escribir. Los tokens `WRITE` pueden leer y agregar registros; no administran otros proyectos ni credenciales.

`save_checkpoint` exige `expectedRevision` y un `requestId` UUID. Si otro entorno escribió primero, devuelve un error de revisión y el agente debe leer, conciliar y volver a intentar. Reutilizar el mismo `requestId` con los mismos datos devuelve el registro existente. Usarlo con datos distintos falla.

Se utiliza el transporte Streamable HTTP en modo sin estado, con `Authorization: Bearer …` en **cada petición**. Es una conexión de credenciales manuales para IDE; no implementa un servidor OAuth ni registro dinámico de clientes. Los clientes de navegador con cabecera `Origin` se rechazan en `/mcp`.

## Migrar el contexto inicial

1. En el entorno donde ya trabajas, pide a Codex un resumen de arquitectura, decisiones aceptadas, restricciones, progreso, pruebas y próximos pasos. No incluyas secretos.
2. Crea el proyecto y pega lo estable en **Editar contexto → Contexto vigente**.
3. Registra decisiones y avances individuales desde la consola o con `save_checkpoint`.
4. Agrega rama y commit reales para distinguir qué código respalda cada registro.
5. Conecta el segundo entorno y consulta `get_project_context` antes de continuar.

Guardar un resumen crea una copia en el historial. No se reemplaza ni elimina el historial de avances.

## Desarrollo en IntelliJ IDEA

Requisitos locales: JDK 21, Node.js 24 y Docker para PostgreSQL.

1. Abre la **raíz** `context-bridge` como proyecto Gradle. Selecciona JDK 21 como Project SDK y Gradle JVM. Usa el wrapper.
2. Genera `.env` si no existe.
3. Levanta solo la base con el puerto local de desarrollo:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d postgres
```

4. Ejecuta el backend:

```bash
./gradlew :backend:bootRun
```

En Windows: `gradlew.bat :backend:bootRun`. La tarea `bootRun` lee el `.env` de la raíz; no modifica las variables de tu sistema. También se incluye la configuración **Context Bridge · Backend** en `.run/`.

5. En otra terminal ejecuta la consola:

```bash
cd frontend
npm ci
npm run dev
```

Abre la URL local que muestra Vite. Sus rutas `/api` se envían al backend en `localhost:8080`. En el contenedor final todo se sirve desde el mismo origen, sin CORS y sin servidor Node de producción.

IntelliJ IDEA dispone del soporte Java/Gradle correspondiente. PyCharm y WebStorm pueden conectarse al MCP y editar la consola; para desarrollar Java con todas las funciones usa IntelliJ IDEA. La configuración npm de `.run/` requiere el soporte JavaScript de tu edición.

## Pruebas

```bash
./gradlew :backend:test
./gradlew :backend:integrationTest
cd frontend
npm ci
npm test
npm run build
```

- `test`: contratos transaccionales con H2 en modo PostgreSQL y pruebas HTTP de seguridad/MCP con MockMvc.
- `integrationTest`: repite el contrato de persistencia con **PostgreSQL 18 real mediante Testcontainers**. Requiere Docker y falla si no está disponible; no omite silenciosamente las pruebas.
- Las pruebas cubren escrituras simultáneas, revisiones desactualizadas, idempotencia, historial de resúmenes, paginación, búsqueda literal, autenticación, CSRF, permisos y revocación.
- GitHub Actions ejecuta backend, PostgreSQL y consola en un runner con Docker.

## Seguridad y operación

- Login administrativo con contraseña BCrypt, sesión HttpOnly, SameSite=Lax y protección CSRF.
- Tokens aleatorios de 256 bits, almacenados como SHA-256; vigencia de 1–365 días y revocación inmediata en la siguiente petición.
- El endpoint MCP tiene su propia cadena de seguridad: una sesión administrativa del navegador no autentica un cliente MCP.
- La aplicación final corre sin root y con sistema de archivos de solo lectura; usa `/tmp` temporal.
- La sesión web reside en memoria. Reiniciar la app cierra las sesiones; el contexto y los tokens permanecen en PostgreSQL.
- Esta base usa un administrador inicial, sin registro público, recuperación por correo ni MFA. Un proxy con límites de solicitudes complementa el login en despliegues accesibles por Internet.
- Conserva respaldos de PostgreSQL antes de actualizar versiones o aplicar migraciones. No incluyas `.env`, tokens ni datos reales en Git.

## Estructura

```text
backend/          Spring Boot, seguridad, API, MCP, Flyway y pruebas
frontend/         Consola React + TypeScript
scripts/          Generación del entorno
.run/             Configuraciones compartidas de JetBrains
docs/             Ejemplos de MCP, Codex y AGENTS.md
compose.yaml      Aplicación y PostgreSQL con persistencia
compose.dev.yaml  Puerto PostgreSQL solo para desarrollo local
Dockerfile        Construcción de consola y servidor en una sola imagen
```

## Referencias oficiales

- [Codex en JetBrains AI Assistant](https://www.jetbrains.com/help/ai-assistant/codex-agent.html)
- [MCP en JetBrains](https://www.jetbrains.com/help/ai-assistant/mcp.html)
- [Spring AI MCP Server](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-server-boot-starter-docs.html)
- [Spring Boot](https://docs.spring.io/spring-boot/)

El estado concreto de las verificaciones de esta entrega está en [`VERIFICATION.md`](VERIFICATION.md).
