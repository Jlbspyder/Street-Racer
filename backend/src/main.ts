import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import type { INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { configuration } from './config'
import { ApiErrors } from './errors'
import { documentResponses } from './docs'

export function configureApp(app: INestApplication) {
  const config = configuration()
  app.enableCors({ origin: config.frontend, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization'] })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, forbidUnknownValues: true }))
  app.useGlobalFilters(new ApiErrors())
  app.enableShutdownHooks()
  const document = SwaggerModule.createDocument(app, new DocumentBuilder()
    .setTitle('Street Racer API').setVersion('1.0')
    .setDescription('REST API for accounts and persistent racing progression. Distances use metres; durations use active seconds; speeds use km/h. Score = floor(distance * 10). Invalid runs are retained but never award progression. Errors contain statusCode, error, message and code.')
    .addBearerAuth().build())
  documentResponses(document)
  SwaggerModule.setup('api/docs', app, document)
}

export async function bootstrap() {
  const config = configuration()
  const app = await NestFactory.create(AppModule, { bodyParser: true })
  configureApp(app)
  await app.listen(config.port, '0.0.0.0')
  console.log(`Street Racer API on port ${config.port}; documentation at /api/docs`)
}

if (require.main === module) void bootstrap().catch((error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error('Port ' + (process.env.PORT ?? 3000) + ' is already in use. If Street Racer is already running, use the existing server; otherwise stop the process using that port and retry.')
  } else {
    console.error('API startup failed. Check environment settings, database availability and migrations.')
  }
  process.exitCode = 1
})

