import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connection established');
    } catch (err) {
      // Log the error but do NOT crash the application at startup.
      // The app can still serve non-DB routes. Actual DB calls will fail
      // at request time with a clear error if the DB is unavailable.
      this.logger.warn(
        `Database connection failed: ${(err as Error).message}. ` +
          'The application will start but database operations will fail. ' +
          'Please set a valid DATABASE_URL in your .env file.',
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
