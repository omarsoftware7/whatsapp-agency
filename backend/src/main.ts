import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import * as session from 'express-session';
import * as connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, n8n server-side)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Clean request logging
  const reqLogger = new Logger('HTTP');
  app.use((req: any, res: any, next: any) => {
    const { method, originalUrl } = req;
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      const status: number = res.statusCode;
      if (status >= 400) {
        reqLogger.warn(`${method} ${originalUrl} ${status} +${ms}ms`);
      } else {
        reqLogger.log(`${method} ${originalUrl} ${status} +${ms}ms`);
      }
    });
    next();
  });

  const PgSession = connectPgSimple(session);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

  app.use(
    session({
      store: new PgSession({ pool, tableName: 'session', createTableIfMissing: true }),
      name: process.env.SESSION_NAME || 'launcho_web',
      secret: process.env.SESSION_SECRET || 'change_me',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' required for cross-subdomain cookies
        domain: process.env.NODE_ENV === 'production' ? '.omar-software.com' : undefined,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Launcho API running on port ${port}`);
}

bootstrap().catch((err) => {
  new Logger('Bootstrap').error('Startup failed', err?.stack ?? err);
  process.exit(1);
});
