const { google } = require('googleapis');
const sdk = require('node-appwrite');

// إعداد الاتصال بـ Google Sheets API
const sheets = google.sheets('v4');
const apiKey = process.env.GOOGLE_API_KEY;
const spreadsheetId = '1JbElBBvoEWvkyJ8aWhmSTh3MnMDEfHu9K3vaiyuNZ7s';
const range = 'tracking(M)!A3:Y36';

// إعداد اتصال بـ Appwrite
const client = new sdk.Client();
client
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('672ea045003d944c6ef4')
  .setKey(process.env.APPWRITE_API_KEY);

// إنشاء كائن الـ Databases
const databases = new sdk.Databases(client);

// دالة جلب البيانات من جوجل شيت
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

// دالة لتخزين البيانات في Appwrite على دفعات
async function storeDataInAppwrite(data, batchSize = 10) {
    let success = true;
    let errorMessages = [];
    let storedDataCount = 0;

    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        for (let rowIndex = 0; rowIndex < batch.length; rowIndex++) {
            const row = batch[rowIndex];

            // بناء المستند الذي سيتم تخزينه
            const document = {
                Device: String(row[0] || '0'),  // Column A
                Team: String(row[1] || '0'),    // Column B
                email: String(row[2] || '0'),   // Column C
                Name: String(row[5] || '0'),    // Column F (Name)
                Countforallqueues: String(row[6] || '0'), // Column G (Countforallqueues)
                Quality: String(row[7] || '0'), // Column H (Quality)
                Countforeachqueue: String(row[11] || '0'), // Column L (Countforeachqueue)
                QualityperDay: String(row[12] || '0'), // Column M (QualityperDay)
                Countpertoday: String(row[13] || '0'), // Column N (Countpertoday)
                LastSubmission: String(row[24] || '0'), // Column X (LastSubmission)
                lasttask: String(row[25] || '0'), // Column Y (lasttask)
            };

            // تصفية الحقول الفارغة أو غير المقبولة
            const filteredDocument = Object.fromEntries(
                Object.entries(document).filter(([key, value]) => value !== null && value !== "" && value !== "غير مقبول")
            );

            try {
                await databases.createDocument(
                    '672ea38f00030293896f',  // Database ID
                    '672ea3ba002e71c7a82b',  // Collection ID
                    sdk.ID.unique(),         // إنشاء معرف فريد للمستند
                    filteredDocument
                );
                storedDataCount++;
            } catch (error) {
                success = false;
                errorMessages.push(`خطأ في تخزين بيانات الصف ${i + rowIndex + 1}: ${error.message}`);
            }
        }

        // تأخير مؤقت بين الدفعات لتجنب تجاوز المهلة
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (success) {
        return { status: 'success', message: `تم نقل ${storedDataCount} صفوف بنجاح!` };
    } else {
        return { status: 'error', message: `تم العثور على الأخطاء: ${errorMessages.join(', ')}` };
    }
}

// دالة معالج الطلبات
exports.handler = async function(event, context) {
    try {
        // جلب البيانات من Google Sheets
        const data = await fetchGoogleSheetData();
        // تخزين البيانات في Appwrite
        const result = await storeDataInAppwrite(data);
        // إرجاع النتيجة
        return {
            statusCode: 200,
            body: JSON.stringify(result),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                status: 'error',
                message: `حدث خطأ: ${error.message}`,
            }),
        };
    }
};
