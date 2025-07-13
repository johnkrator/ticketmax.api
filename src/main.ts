import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

// Now import other modules
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    console.log('✅ Database connection established');

    app.enableCors({
      origin: true,
      credentials: true,
    });

    const config = new DocumentBuilder()
      .setTitle('AI-Todo')
      .setDescription('The AI-Todo API description')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) =>
        methodKey,
    });

    // Sort the paths alphabetically
    const sortedPaths = {};
    Object.keys(document.paths)
      .sort((a, b) => a.localeCompare(b))
      .forEach((key) => {
        const methods = document.paths[key];
        const sortedMethods = {};

        // Sort methods within each path alphabetically
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
      document.tags = document.tags.sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    }

    SwaggerModule.setup('api', app, document);

    app.useStaticAssets(resolve('./src/public'));
    app.setBaseViewsDir(resolve('./src/views'));
    app.setViewEngine('hbs');

    const port = process.env.PORT || 3500;
    await app.listen(port);
    console.log(`🚀 Application is running on: http://localhost:${port}`);
  } catch (error) {
    console.error('❌ Failed to start application:', error.message);

    // More specific error handling for database issues
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

bootstrap();
