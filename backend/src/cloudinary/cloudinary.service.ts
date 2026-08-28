import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'node:stream';
import 'multer';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    this.initCloudinary();
  }

  private isSecretPlaceholder(val?: string): boolean {
    if (!val) return true;
    const lower = val.toLowerCase().trim();
    return (
      lower === '' ||
      lower.includes('your-') ||
      lower.includes('**********') ||
      lower === 'your-actual-api-secret' ||
      lower === 'your-api-secret'
    );
  }

  private initCloudinary(): boolean {
    const cloudinaryUrl = this.configService.get<string>('CLOUDINARY_URL') || process.env.CLOUDINARY_URL;
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME') || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY') || process.env.CLOUDINARY_API_KEY;
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET') || process.env.CLOUDINARY_API_SECRET;

    if (cloudinaryUrl && !this.isSecretPlaceholder(cloudinaryUrl)) {
      cloudinary.config({
        cloudinary_url: cloudinaryUrl,
        secure: true,
      });
      this.logger.log('Cloudinary configured via CLOUDINARY_URL.');
      return true;
    }

    if (
      cloudName &&
      apiKey &&
      apiSecret &&
      !this.isSecretPlaceholder(cloudName) &&
      !this.isSecretPlaceholder(apiKey) &&
      !this.isSecretPlaceholder(apiSecret)
    ) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.logger.log(`Cloudinary configured for cloud: ${cloudName}`);
      return true;
    }

    this.logger.warn(
      'Cloudinary credentials are not configured or contain placeholder values in .env. ' +
        'Please set valid CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
    );
    return false;
  }

  /**
   * Uploads a PDF file buffer to Cloudinary.
   */
  async uploadPdf(file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    const isReady = this.initCloudinary();

    const sanitizedFilename = (file.originalname || 'document.pdf')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.[^/.]+$/, '');
    
    // Ensure public_id includes .pdf so Cloudinary delivers the asset with .pdf extension
    const publicId = `policy_documents/${Date.now()}_${sanitizedFilename}.pdf`;

    if (!isReady) {
      // Return a working local development data preview or warning
      const fallbackUrl = `http://localhost:3001/documents/dev-preview/${Date.now()}_${sanitizedFilename}.pdf`;
      this.logger.warn(
        `Cloudinary credentials not active. Using development fallback URL: ${fallbackUrl}`,
      );
      return {
        url: fallbackUrl,
        publicId,
      };
    }

    return new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          public_id: publicId,
          use_filename: true,
          unique_filename: false,
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            this.logger.error(
              `Cloudinary upload error: ${error?.message ?? 'Unknown error'}`,
            );
            return reject(
              new Error(`Cloudinary upload failed: ${error?.message ?? 'Unknown error'}`),
            );
          }

          this.logger.log(`Cloudinary upload successful: ${result.secure_url}`);
          resolve({
            url: result.secure_url || result.url,
            publicId: result.public_id,
          });
        },
      );

      const stream = Readable.from(file.buffer);
      stream.pipe(uploadStream);
    });
  }

  /**
   * Uploads an evidence file (PDF, image, document) to Cloudinary.
   */
  async uploadEvidenceFile(file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    const isReady = this.initCloudinary();

    const originalName = file.originalname || 'evidence_file';
    const sanitizedFilename = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const publicId = `evidence/${Date.now()}_${sanitizedFilename}`;

    if (!isReady) {
      const fallbackUrl = `http://localhost:3001/actions/evidence-preview/${Date.now()}_${sanitizedFilename}`;
      this.logger.warn(
        `Cloudinary credentials not active. Using development fallback URL for evidence: ${fallbackUrl}`,
      );
      return {
        url: fallbackUrl,
        publicId,
      };
    }

    return new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          public_id: publicId,
          use_filename: true,
          unique_filename: false,
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            this.logger.error(
              `Cloudinary evidence upload error: ${error?.message ?? 'Unknown error'}`,
            );
            return reject(
              new Error(`Cloudinary evidence upload failed: ${error?.message ?? 'Unknown error'}`),
            );
          }

          this.logger.log(`Cloudinary evidence upload successful: ${result.secure_url}`);
          resolve({
            url: result.secure_url || result.url,
            publicId: result.public_id,
          });
        },
      );

      const stream = Readable.from(file.buffer);
      stream.pipe(uploadStream);
    });
  }
}
