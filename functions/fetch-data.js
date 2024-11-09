const { google } = require('googleapis');
const sdk = require('node-appwrite');

// إعداد الاتصال بـ Google Sheets API
const sheets = google.sheets('v4');

const apiKey = process.env.GOOGLE_API_KEY;
const spreadsheetId = '1yhnXFDyMyCwFP0ttUKG_h9Egw4lrKaJ0HMUR40fQRiY';
const range = 'tracking(M)!A1:Z';

// إعداد اتصال بـ Appwrite
const client = new sdk.Client();
client.setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('672ea045003d944c6ef4')
  .setKey(process.env.APPWRITE_API_KEY);

const database = new sdk.Databases(client);

async function fetchGoogleSheetData() {
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range,
        key: apiKey,
    });

    const rows = res.data.values;
    return rows;
}

async function storeDataInAppwrite(data) {
    for (let row of data) {
        const document = {
            Device: row[0],
            Team: row[1],
            email: row[2],
            Name: row[4],
            Countforallqueues: row[5],
            Quality: row[6],
            Countforeachqueue: row[7],
            QualityperDay: row[8],
            Countpertoday: row[9],
            LastSubmission: row[10],
            lasttask: row[11],
        };

        try {
            await database.createDocument('672ea3ba002e71c7a82b', document);
            console.log('Data stored successfully in Appwrite');
        } catch (error) {
            console.error('Error storing data in Appwrite:', error);
        }
    }
}

exports.handler = async function(event, context) {
    try {
        const data = await fetchGoogleSheetData();
        if (data.length) {
            await storeDataInAppwrite(data);
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Data fetched and stored successfully!' })
            };
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'No data found in Google Sheets.' })
            };
        }
    } catch (error) {
        console.error('Error in fetch-data function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'An error occurred while fetching data.' })
        };
    }
};
