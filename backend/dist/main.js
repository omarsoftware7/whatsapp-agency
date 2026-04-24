"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const session = require("express-session");
const connectPgSimple = require("connect-pg-simple");
const pg_1 = require("pg");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api');
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (allowedOrigins.includes(origin))
                return callback(null, true);
            return callback(new Error(`CORS: ${origin} not allowed`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    const PgSession = connectPgSimple(session);
    const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });
    app.use(session({
        store: new PgSession({ pool, tableName: 'session', createTableIfMissing: true }),
        name: process.env.SESSION_NAME || 'launcho_web',
        secret: process.env.SESSION_SECRET || 'change_me',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            domain: process.env.NODE_ENV === 'production' ? '.omar-software.com' : undefined,
            maxAge: 30 * 24 * 60 * 60 * 1000,
        },
    }));
    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`Launcho API running on port ${port}`);
}
bootstrap().catch((err) => {
    console.error('Bootstrap failed:', err);
    process.exit(1);
});
//# sourceMappingURL=main.js.map