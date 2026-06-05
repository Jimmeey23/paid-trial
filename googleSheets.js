const { google } = require('googleapis');

/**
 * Google Sheets Integration Module
 * Automatically appends form submissions to Google Sheets
 */

class GoogleSheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '';
    this.sheetName = process.env.GOOGLE_SHEET_NAME || 'Website';
    this.isConfigured = Boolean(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN &&
      this.spreadsheetId
    );
    
    this.initialize();
  }

  /**
   * Initialize Google OAuth2 client
   */
  initialize() {
    try {
      if (!this.isConfigured) {
        return;
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'https://developers.google.com/oauthplayground' // Redirect URI
      );

      // Set refresh token
      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
      });

      this.auth = oauth2Client;
      this.sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    } catch (error) {
      console.error('Failed to initialize Google Sheets API:', error.message);
    }
  }

  async hasLeadEvent(eventId) {
    if (!this.sheets || !eventId) {
      return false;
    }

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!X:X`
      });

      const rows = response.data.values || [];
      return rows.some((row) => String(row?.[0] || '').trim() === String(eventId).trim());
    } catch (error) {
      console.error('Unable to check Google Sheet for duplicate event ID:', error.message);
      return false;
    }
  }

  /**
   * Append a row to the Google Sheet
   * @param {Object} leadData - The lead data to append
   * @returns {Promise<Object>} - Result of the append operation
   */
  async appendLead(leadData) {
    if (!this.sheets) {
      throw new Error('Google Sheets API not initialized');
    }

    try {
      if (leadData.event_id && await this.hasLeadEvent(leadData.event_id)) {
        return {
          success: true,
          skipped: true,
          reason: 'Lead already exists in Google Sheets for this event ID.'
        };
      }

      // Prepare row data in the correct order
      const row = [
        new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), // Timestamp
        leadData.firstName || '',
        leadData.lastName || '',
        leadData.email || '',
        leadData.phoneNumber || '',
        leadData.time || '',
        leadData.center || '',
        leadData.type || '',
        leadData.utm_source || '',
        leadData.utm_medium || '',
        leadData.utm_campaign || '',
        leadData.utm_content || '',
        leadData.utm_term || '',
        leadData.gclid || '',
        leadData.fbclid || '',
        leadData.msclkid || '',
        leadData.ttclid || '',
        leadData.gbraid || '',
        leadData.wbraid || '',
        leadData.fbp || '',
        leadData.fbc || '',
        leadData.landing_page || '',
        leadData.referrer || '',
        leadData.event_id || '',
        leadData.childName || '',
        leadData.childAge || '',
        leadData.batch || leadData.batchPreference || ''
      ];

      const request = {
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:AA`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [row]
        }
      };

      const response = await this.sheets.spreadsheets.values.append(request);

      return {
        success: true,
        updatedRange: response.data.updates.updatedRange,
        updatedRows: response.data.updates.updatedRows
      };
    } catch (error) {
      console.error('Error appending to Google Sheet:', error.message);
      throw error;
    }
  }

  /**
   * Setup sheet headers (run once to create headers)
   * @returns {Promise<Object>}
   */
  async setupHeaders() {
    if (!this.sheets) {
      throw new Error('Google Sheets API not initialized');
    }

    try {
      const headers = [
        'Timestamp',
        'First Name',
        'Last Name',
        'Email',
        'Phone Number',
        'Preferred Time',
        'Studio Location',
        'Class Type',
        'UTM Source',
        'UTM Medium',
        'UTM Campaign',
        'UTM Content',
        'UTM Term',
        'Google Click ID',
        'Facebook Click ID',
        'Microsoft Click ID',
        'TikTok Click ID',
        'Google Braid ID',
        'Google Web Braid ID',
        'Meta Browser ID (fbp)',
        'Meta Click ID (fbc)',
        'Landing Page',
        'Referrer',
        'Event ID',
        'Child Name',
        'Child Age',
        'Batch'
      ];

      const request = {
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A1:AA1`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [headers]
        }
      };

      await this.sheets.spreadsheets.values.update(request);
      
      // Format headers (bold)
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [{
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true
                  },
                  backgroundColor: {
                    red: 0.9,
                    green: 0.9,
                    blue: 0.9
                  }
                }
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor)'
            }
          }]
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error setting up Google Sheets headers:', error.message);
      throw error;
    }
  }

  /**
   * Test the connection to Google Sheets
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    if (!this.sheets) {
      return false;
    }

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      return true;
    } catch (error) {
      console.error('Google Sheets connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = GoogleSheetsService;
