import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as sharp from 'sharp';

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const accountId = config.get<string>('R2_ACCOUNT_ID', '');
    this.bucket = config.get<string>('R2_BUCKET', 'launcho-uploads');
    this.publicUrl = config.get<string>('R2_PUBLIC_URL', '').replace(/\/$/, '');

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.get<string>('R2_ACCESS_KEY_ID') ?? '',
        secretAccessKey: config.get<string>('R2_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  async upload(key: string, data: Buffer, mimeType: string): Promise<string> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: mimeType,
    }));
    const url = `${this.publicUrl}/${key}`;
    this.logger.log(`☁️  R2 upload: ${key} → ${url}`);
    return url;
  }

  async uploadAsPng(subdir: string, baseName: string, data: Buffer): Promise<string> {
    const png = await sharp(data).png().toBuffer();
    const filename = baseName.replace(/\.[^.]+$/, '') + '.png';
    const key = this.buildKey(subdir, filename);
    return this.upload(key, png, 'image/png');
  }

  buildKey(subdir: string, filename: string): string {
    return subdir ? `${subdir}/${filename}` : filename;
  }

  isConfigured(): boolean {
    return !!(
      this.config.get('R2_ACCOUNT_ID') &&
      this.config.get('R2_ACCESS_KEY_ID') &&
      this.config.get('R2_SECRET_ACCESS_KEY')
    );
  }
}
