const { google } = require('googleapis');
const sdk = require('node-appwrite');

// إعداد الاتصال بـ Google Sheets API
const sheets = google.sheets('v4');

const apiKey = process.env.GOOGLE_API_KEY;
const spreadsheetId = '1yhnXFDyMyCwFP0ttUKG_h9Egw4lrKaJ0HMUR40fQRiY';
const range = 'tracking(M)!A1:Z';

// إعداد اتصال بـ Appwrite
const client = new sdk.Client();
client
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('672ea045003d944c6ef4')
    .setKey(process.env.APPWRITE_API_KEY);

const database = new sdk.Databases(client); // استخدام كلاس Databases بشكل صحيح

// دالة لجلب البيانات من Google Sheets
async function fetchGoogleSheetData() {
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: range,
            key: apiKey,
        });

        const rows = res.data.values;

        if (!rows || rows.length === 0) {
            throw new Error('No data found in the specified range.');
        }

        return rows;

    } catch (error) {
        if (error.code === 403) {
            throw new Error('Google Sheets API key is invalid or expired.');
        } else if (error.code === 404) {
            throw new Error('Spreadsheet ID or range not found. Please check the provided values.');
        } else {
            throw new Error(`Error fetching data from Google Sheets: ${error.message}`);
        }
    }
}

// دالة لتخزين البيانات في Appwrite
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
            await database.createDocument('672ea3ba002e71c7a82b', 'collectionID', document);
        } catch (error) {
            success = false;
            let errorMessage = `Error storing document for ${row[0]}: ${error.message}`;

            // إضافة مزيد من التفاصيل حول الخطأ بناءً على حالة الاستجابة
            if (error.response && error.response.status === 401) {
                errorMessage = `Unauthorized: Invalid Appwrite API key for row with Device ${row[0]}.`;
            } else if (error.response && error.response.status === 404) {
                errorMessage = `Database or collection ID not found for row with Device ${row[0]}.`;
            } else if (error.response && error.response.status === 400) {
                errorMessage = `Bad Request: Invalid data format for row with Device ${row[0]}.`;
            }

            errorMessages.push(errorMessage);
            console.error(errorMessage); // سجل التفاصيل في الكونسول لتتبع الخطأ
        }
    }

    return { success, errorMessages };
}

// الوظيفة الرئيسية
exports.handler = async function(event, context) {
    try {
        // جلب البيانات من Google Sheets
        const data = await fetchGoogleSheetData();

        // التحقق من وجود بيانات قابلة للنقل
        if (data.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'No valid data found in Google Sheets.' })
            };
        }

        // تخزين البيانات في Appwrite
        const { success, errorMessages } = await storeDataInAppwrite(data);

        if (success) {
            return {
                statusCode: 200,
                body: JSON.stringify({ message: 'Data fetched and stored successfully!' })
            };
        } else {
            // في حالة حدوث خطأ، إرسال التفاصيل عن الأخطاء
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    message: 'Data was not fully transferred.',
                    errors: errorMessages 
                })
            };
        }

    } catch (error) {
        // رسائل خطأ تفصيلية حسب المصدر (Google Sheets أو Appwrite)
        let errorMessage = `Error in fetch-data function: ${error.message}`;

        return {
            statusCode: 500,
            body: JSON.stringify({ message: errorMessage })
        };
    }
};
