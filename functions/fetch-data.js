const { google } = require('googleapis');
const sdk = require('node-appwrite');

// إعداد الاتصال بـ Google Sheets API
const sheets = google.sheets('v4');

const apiKey = process.env.GOOGLE_API_KEY; // احفظ API Key كمتغير بيئي
const spreadsheetId = '1yhnXFDyMyCwFP0ttUKG_h9Egw4lrKaJ0HMUR40fQRiY'; // ضع هنا ID الخاص بجوجل شيت
const range = 'tracking(M)!A1:Z'; // النطاق الذي يحتوي على البيانات

// إعداد اتصال بـ Appwrite
const client = new sdk.Client();
client.setEndpoint('https://cloud.appwrite.io/v1') // أدخل عنوان الـ API الخاص بـ Appwrite
  .setProject('672ea045003d944c6ef4')          // أدخل الـ Project ID الخاص بك
  .setKey(process.env.APPWRITE_API_KEY);  // أدخل الـ API Key الخاص بـ Appwrite

const database = new sdk.Database(client);

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
            Device: row[0],        // ID من جوجل شيت
            Team: row[1],      // الاسم
            email: row[2],     // البريد الإلكتروني
            Name: row[4],
            Countforallqueues: row[5],
            Quality: row[6],
            Countforeachqueue: row[7],
            QualityperDay: row[8],     // الهاتف
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
