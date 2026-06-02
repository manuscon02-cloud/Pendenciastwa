const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
  }

  async authenticate() {
    try {
      let credentials;

      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        console.log('✅ Credenciais carregadas da variável de ambiente');
      } else {
        const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './google-credentials.json';

        if (!fs.existsSync(credentialsPath)) {
          throw new Error(
            `Arquivo de credenciais não encontrado: ${credentialsPath}\n` +
            'Crie uma Service Account no Google Cloud e salve as credenciais neste arquivo.'
          );
        }

        credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      }

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      console.log('✅ Google Sheets autenticado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao autenticar Google Sheets:', error.message);
      return false;
    }
  }

  async readSheet(spreadsheetId, range) {
    try {
      if (!this.sheets) {
        await this.authenticate();
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      return response.data.values || [];
    } catch (error) {
      console.error(`❌ Erro ao ler planilha (${range}):`, error.message);
      return [];
    }
  }

  async listSheetNames(spreadsheetId) {
    try {
      if (!this.sheets) {
        await this.authenticate();
      }

      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
      });

      const sheets = response.data.sheets || [];
      return sheets.map(sheet => sheet.properties.title);
    } catch (error) {
      console.error('❌ Erro ao listar abas:', error.message);
      return [];
    }
  }

  async getGestaoCompartilhada(spreadsheetId) {
    const rows = await this.readSheet(spreadsheetId, "'Ocorrências e Ações'!A4:N1000");

    if (rows.length === 0) return [];

    const header = ['Data', 'Mes', 'Tipo', 'Obra', 'Projeto', 'Ocorrencia',
                    'InformadoPor', 'Acao', 'Prazo', 'Responsavel',
                    'DataConclusao', 'Situacao', 'Observacoes', 'Setor'];

    return rows
      .filter(row => row[0] && row[0].trim() !== '')
      .map(row => {
        const obj = {};
        header.forEach((key, index) => {
          obj[key] = row[index] || '';
        });
        return obj;
      });
  }

  async getSolicitacoesCompra(spreadsheetId) {
    const rows = await this.readSheet(spreadsheetId, "'SC'!A2:M1000");

    if (rows.length === 0) return [];

    const header = ['SC', 'DataAbertura', 'DataNecessidade', 'DataAprovacao',
                    'Descricao', 'Obra', 'Projeto', 'Responsavel',
                    'DiasEmAberto', 'Situacao', 'StatusSC', 'Extra', 'Encerrado'];

    return rows
      .filter(row => row[0] && row[0].trim() !== '')
      .map(row => {
        const obj = {};
        header.forEach((key, index) => {
          obj[key] = row[index] || '';
        });
        return obj;
      });
  }

  parseDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') return null;

    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    if (year < 100) {
      year += 2000;
    }

    return new Date(year, month, day);
  }
}

module.exports = new GoogleSheetsService();
