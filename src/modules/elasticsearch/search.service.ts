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
    } catch (e: any) {
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
    } catch (e: any) {
      this.logger.warn(`ES Search error: ${e.message}. Fallback to DB.`);
      return null;
    }
  }

  async deletePelangganIndex(id: string) {
    if (!this.isEnabled || !this.esClient) return;
    try {
      await this.esClient.delete({ index: 'pelanggan', id });
    } catch (e) {
      // Ignore if not found
    }
  }

  async bulkIndexPelanggan(pelangganList: any[]) {
    if (!this.isEnabled || !this.esClient || pelangganList.length === 0) return;
    try {
      const operations = pelangganList.flatMap((p) => [
        { index: { _index: 'pelanggan', _id: p.id_pelanggan } },
        {
          id_pelanggan: p.id_pelanggan,
          nama: p.nama,
          alamat: p.alamat,
          kelurahan: p.kelurahan,
          kecamatan: p.kecamatan,
          va: p.va,
        },
      ]);
      await this.esClient.bulk({ refresh: true, operations });
      this.logger.log(`Bulk indexed ${pelangganList.length} Pelanggan records into Elasticsearch.`);
    } catch (e: any) {
      this.logger.error(`ES Bulk Index error: ${e.message}`);
    }
  }
}
