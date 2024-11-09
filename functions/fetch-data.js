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

const database = client.database;

async function fetchGoogleSheetData() {
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: range,
            key: apiKey,
        });

        if (!res.data.values || res.data.values.length === 0) {
            throw new Error('لا توجد بيانات في Google Sheets');
        }
        return res.data.values;
    } catch (error) {
        throw new Error(`خطأ في جلب البيانات من Google Sheets: ${error.message}`);
    }
}

async function storeDataInAppwrite(data) {
    let success = true;
    let errorMessages = [];
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
            if (row.length < 12) { // تحقق من أن الصف يحتوي على البيانات الكاملة
                throw new Error(`الصف ${row[0]} يحتوي على بيانات غير كاملة`);
            }
            await database.createDocument('672ea3ba002e71c7a82b', document);
        } catch (error) {
            success = false;
            errorMessages.push(`Error storing document for ${row[0]}: ${error.message}`);
            console.error(`Error storing document for ${row[0]}:`, error);
        }
    }
    return { success, errorMessages };
}

exports.handler = async function(event, context) {
    try {
        const data = await fetchGoogleSheetData();
        if (data.length) {
            const { success, errorMessages } = await storeDataInAppwrite(data);
            if (success) {
                return {
                    statusCode: 200,
                    body: JSON.stringify({ message: 'تم نقل البيانات بنجاح!' })
                };
            } else {
                return {
                    statusCode: 500,
                    body: JSON.stringify({
                        message: 'Data was not fully transferred.',
                        errors: errorMessages // إرسال تفاصيل الأخطاء للمستخدم
                    })
                };
            }
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
            body: JSON.stringify({ message: `حدث خطأ أثناء جلب البيانات: ${error.message}` })
        };
    }
};
