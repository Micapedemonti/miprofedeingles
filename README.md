# Mi profe de inglés — backend fase 2

Backend inicial con NestJS, PostgreSQL, Prisma 6, JWT, Zod y OpenAI Responses API.

## Requisitos en macOS

- Node.js 22 LTS
- pnpm 9+
- Docker Desktop
- Una API key de OpenAI (solo necesaria para `POST /api/v1/lessons/generate`)

Comprueba las instalaciones:

```bash
node -v
pnpm -v
docker --version
```

## Arranque desde cero

En la raíz del proyecto:

```bash
cp .env.example .env
```

Edita `.env`: cambia `JWT_SECRET` por un secreto aleatorio de al menos 32 caracteres y cambia `BOOTSTRAP_PASSWORD`. Para crear uno en macOS:

```bash
openssl rand -base64 36
```

Instala dependencias y levanta PostgreSQL:

```bash
pnpm install
pnpm db:up
```

Cuando PostgreSQL esté saludable:

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev:api
```

API: `http://localhost:3000/api/v1`
Health: `http://localhost:3000/api/v1/health`

## Frontend (apps/web)

React + Vite + TypeScript. Con la API corriendo, en otra terminal:

```bash
pnpm dev:web
```

Abre `http://localhost:5173`. Vite redirige `/api` a `http://localhost:3000`, así que no hace falta configurar URLs.

Pantallas: login, inicio (meta diaria + unidades), lección (genera y reproduce ejercicios), libreta (puntos débiles y notas de clase), progreso y perfil. El audio usa la síntesis y el reconocimiento de voz del navegador (el reconocimiento funciona mejor en Chrome).

### Usarla en el celular

El front es responsive y se puede instalar en la pantalla de inicio (tiene `manifest.webmanifest` e ícono). Para usarla desde el teléfono hay que publicarla con **HTTPS**: los navegadores móviles solo permiten el micrófono en sitios seguros.

Al publicar:

1. API: define las mismas variables de `.env` en el servicio de hosting y pon `WEB_ORIGIN` con la URL pública del front (por ejemplo `https://mi-profe.vercel.app`).
2. Front: `pnpm build:web` genera `apps/web/dist`. Si la API está en otro dominio, define `VITE_API_URL` con su URL antes de compilar (ver `apps/web/.env.example`). Configura el hosting para que todas las rutas sirvan `index.html` (es una SPA).
3. En el celular abre la URL y usa "Agregar a pantalla de inicio" (Safari: botón Compartir; Chrome: menú ⋮).

### Ejercicios de hablar

La corrección usa el reconocimiento de voz del navegador (mejor en Chrome). Para que no acepte frases mal pronunciadas, exige todas las palabras en orden y una confianza del reconocedor de al menos 80 %. Se permiten 3 intentos por frase; el XP se da solo si sale bien.

## Primer login

El seed crea el usuario definido por `BOOTSTRAP_EMAIL` y `BOOTSTRAP_PASSWORD` si aún no existe. No imprime la contraseña.

Si además defines `DEMO_EMAIL` y `DEMO_PASSWORD` (mínimo 8 caracteres), crea un usuario de prueba con su propio progreso. Volver a correr el seed no cambia la contraseña de un usuario que ya existe.

```bash
curl -s http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"micaela@example.com","password":"change-this-password-now"}'
```

Usa el email y contraseña que realmente configuraste en `.env`. Copia el `accessToken` de la respuesta para las llamadas protegidas:

```bash
curl -s http://localhost:3000/api/v1/me \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN'
```

## Probar libreta y perfil

```bash
curl -s http://localhost:3000/api/v1/notebook \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN'

curl -s http://localhost:3000/api/v1/profile \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN'
```

Agregar una nota:

```bash
curl -s http://localhost:3000/api/v1/notebook/class-notes \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"title":"Clase del viernes","content":"Practiqué preguntas en pasado simple.","topics":["past_simple","questions"]}'
```

Registrar una corrección de ejemplo:

```bash
curl -s -X POST http://localhost:3000/api/v1/notebook/weaknesses \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"category":"verb_tense","wrong":"Yesterday I go running.","correct":"Yesterday I went running.","note":"Para acciones terminadas ayer, usa pasado simple."}'
```

## Probar generación estructurada

Agrega una API key válida a `OPENAI_API_KEY` en `.env` y reinicia la API:

```bash
curl -s -X POST http://localhost:3000/api/v1/lessons/generate \
  -H 'Authorization: Bearer TU_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"unitId":"daily_routine","lessonType":"LISTENING","level":"A2"}'
```

El servicio valida la salida del modelo con Zod antes de devolver ejercicios. La lección se guarda como `Session` con sus `Exercise`; la respuesta correcta se guarda en base de datos y solo se revela al cliente después de contestar.

XP: 10 por respuesta correcta, +10 por terminar la lección y +10 si es perfecta. Estrellas: 3 con ≥90 %, 2 con ≥70 %, 1 al completarla.

## Pruebas

```bash
pnpm test:api
pnpm build:api
```

Las pruebas unitarias no necesitan PostgreSQL. Para probar los endpoints necesitas la base activa.

## Endpoints incluidos

- `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `GET /api/v1/me`
- `GET /api/v1/profile`
- `PATCH /api/v1/profile`
- `GET /api/v1/notebook`
- `POST /api/v1/notebook/weaknesses`
- `POST /api/v1/notebook/class-notes`
- `GET /api/v1/progress`
- `POST /api/v1/lessons/generate` — genera la lección y crea una sesión (las respuestas correctas quedan solo en el servidor)
- `POST /api/v1/sessions/:sessionId/exercises/:exerciseId/answer` — corrige una respuesta, da XP y anota el error en la libreta
- `POST /api/v1/sessions/:sessionId/complete` — cierra la sesión: XP del día, estrellas, desbloqueo de la siguiente lección y logros

## Notas de seguridad y alcance

- La API key de OpenAI nunca se envía al navegador.
- JWT protege los endpoints de usuario.
- Las contraseñas se almacenan con bcrypt.
- El login tiene validación de entrada, pero para un despliegue público todavía hay que añadir rate limiting, rotación/invalidación de tokens, recuperación de cuenta y HTTPS.
- La conversación con memoria (roleplay real con turnos) se completará en su fase específica.
- `prisma migrate dev` genera y aplica la migración inicial en desarrollo. La migración inicial se genera y aplica al ejecutar `pnpm db:migrate`; revisa el SQL nuevo en `apps/api/prisma/migrations/` y consérvalo en Git.
