import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function createApp() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('TicketProMax')
    .setDescription(
      'The TicketProMax Ticketing API - Complete event ticketing solution',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  // Sort the paths alphabetically
  const sortedPaths = {};
  Object.keys(document.paths)
    .sort((a, b) => a.localeCompare(b))
    .forEach((key) => {
      const methods = document.paths[key];
      const sortedMethods = {};

      Object.keys(methods)
        .sort((a, b) => a.localeCompare(b))
        .forEach((method) => {
          sortedMethods[method] = {
            ...methods[method],
            tags: methods[method].tags
              ? methods[method].tags.sort()
              : undefined,
            summary:
              methods[method].summary || `${method.toUpperCase()} ${key}`,
          };
        });
      sortedPaths[key] = sortedMethods;
    });

  document.paths = sortedPaths;

  if (document.tags) {
    document.tags = document.tags.sort((a, b) => a.name.localeCompare(b.name));
  }

  SwaggerModule.setup('api', app, document);

  // Comment out static assets for serverless
  // app.useStaticAssets(resolve('./src/public'));
  // app.setBaseViewsDir(resolve('./src/views'));
  // app.setViewEngine('hbs');

  return app;
}

async function bootstrap() {
  try {
    const app = await createApp();
    const port = process.env.PORT || 3500;
    await app.listen(port);
    console.log(`🚀 TicketProMax API is running on: http://localhost:${port}`);
    console.log(`📚 API Documentation: http://localhost:${port}/api`);
  } catch (error) {
    console.error(
      '❌ Failed to start TicketProMax application:',
      error.message,
    );

    if (
      error.message?.includes('SASL') ||
      error.message?.includes('password')
    ) {
      console.error('💡 This appears to be a database authentication issue.');
      console.error(
        '💡 Please check your database credentials in the .env file.',
      );
    }

    process.exit(1);
  }
}

// For local development
if (process.env.NODE_ENV !== 'production') {
  bootstrap();
}

// For Vercel serverless deployment
let cachedApp: NestExpressApplication;

export default async function handler(req: any, res: any) {
  if (!cachedApp) {
    cachedApp = await createApp();
    await cachedApp.init();
  }

  const httpAdapter = cachedApp.getHttpAdapter();
  return httpAdapter.getInstance()(req, res);
}


// import * as dotenv from 'dotenv';
// import { resolve } from 'path';
//
// dotenv.config({ path: resolve(process.cwd(), '.env') });
//
// // Other entity_modules
// import { NestFactory } from '@nestjs/core';
// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// import { AppModule } from './app.module';
// import { NestExpressApplication } from '@nestjs/platform-express';
//
// async function bootstrap() {
//   try {
//     const app = await NestFactory.create<NestExpressApplication>(AppModule);
//     console.log('✅ Database connection established');
//
//     app.enableCors({
//       origin: true,
//       credentials: true,
//     });
//
//     const config = new DocumentBuilder()
//       .setTitle('TicketProMax')
//       .setDescription(
//         'The TicketProMax Ticketing API - Complete event ticketing solution',
//       )
//       .setVersion('1.0')
//       .addBearerAuth()
//       .build();
//
//     const document = SwaggerModule.createDocument(app, config, {
//       operationIdFactory: (controllerKey: string, methodKey: string) =>
//         methodKey,
//     });
//
//     // Sort the paths alphabetically
//     const sortedPaths = {};
//     Object.keys(document.paths)
//       .sort((a, b) => a.localeCompare(b))
//       .forEach((key) => {
//         const methods = document.paths[key];
//         const sortedMethods = {};
//
//         // Sort methods within each path alphabetically
//         Object.keys(methods)
//           .sort((a, b) => a.localeCompare(b))
//           .forEach((method) => {
//             sortedMethods[method] = {
//               ...methods[method],
//               tags: methods[method].tags
//                 ? methods[method].tags.sort()
//                 : undefined,
//               summary:
//                 methods[method].summary || `${method.toUpperCase()} ${key}`,
//             };
//           });
//         sortedPaths[key] = sortedMethods;
//       });
//
//     document.paths = sortedPaths;
//
//     if (document.tags) {
//       document.tags = document.tags.sort((a, b) =>
//         a.name.localeCompare(b.name),
//       );
//     }
//
//     SwaggerModule.setup('api', app, document);
//
//     app.useStaticAssets(resolve('./src/public'));
//     app.setBaseViewsDir(resolve('./src/views'));
//     app.setViewEngine('hbs');
//
//     const port = process.env.PORT || 3500;
//     await app.listen(port);
//     console.log(`🚀 TicketProMax API is running on: http://localhost:${port}`);
//     console.log(`📚 API Documentation: http://localhost:${port}/api`);
//   } catch (error) {
//     console.error(
//       '❌ Failed to start TicketProMax application:',
//       error.message,
//     );
//
//     // More specific error handling for database issues
//     if (
//       error.message?.includes('SASL') ||
//       error.message?.includes('password')
//     ) {
//       console.error('💡 This appears to be a database authentication issue.');
//       console.error(
//         '💡 Please check your database credentials in the .env file.',
//       );
//     }
//
//     process.exit(1);
//   }
// }
//
// bootstrap();
