import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private esClient: any = null;
  private isEnabled = false;

  constructor(private configService: ConfigService) {
    const node = this.configService.get<string>('ELASTICSEARCH_NODE');
    if (node) {
      try {
        // Lazy require in case elasticsearch package is optional
        const { Client } = require('@elastic/elasticsearch');
        this.esClient = new Client({ node });
        this.isEnabled = true;
        this.logger.log(`Elasticsearch connected to ${node}`);
      } catch (err) {
        this.logger.warn('Elasticsearch client package not loaded. Falling back to DB search.');
      }
    } else {
      this.logger.log('ELASTICSEARCH_NODE not configured. Running with DB-only search.');
    }
  }

  async indexPelanggan(pelanggan: any) {
    if (!this.isEnabled || !this.esClient) return;
    try {
      await this.esClient.index({
        index: 'pelanggan',
        id: pelanggan.id_pelanggan,
        document: {
          id_pelanggan: pelanggan.id_pelanggan,
          nama: pelanggan.nama,
          alamat: pelanggan.alamat,
          kelurahan: pelanggan.kelurahan,
          kecamatan: pelanggan.kecamatan,
          va: pelanggan.va,
        },
      });
    } catch (e) {
      this.logger.error(`ES Index error: ${e.message}`);
    }
  }

  async searchPelanggan(query: string): Promise<string[] | null> {
    if (!this.isEnabled || !this.esClient || !query) return null;
    try {
      const result = await this.esClient.search({
        index: 'pelanggan',
        query: {
          multi_match: {
            query,
            fields: ['id_pelanggan^3', 'nama^2', 'alamat', 'kelurahan'],
            fuzziness: 'AUTO',
          },
        },
      });
      return result.hits.hits.map((hit: any) => hit._id);
    } catch (e) {
      this.logger.warn(`ES Search error: ${e.message}. Fallback to DB.`);
      return null;
    }
  }
}
