const { google } = require('googleapis');
const sdk = require('node-appwrite');

// إعداد الاتصال بـ Google Sheets API
const sheets = google.sheets('v4');
const apiKey = process.env.GOOGLE_API_KEY;
const spreadsheetId = '1EbKvgMRzVKucfGuIOUqJbfncI194MNGJO-9ZVmIJnIw';
const range = 'tracking(M)!A1:Z';

// إعداد اتصال بـ Appwrite
const client = new sdk.Client();
client
  .setEndpoint('https://cloud.appwrite.io/v1') // وضع عنوان الـ Appwrite الصحيح
  .setProject('672ea045003d944c6ef4') // وضع معرّف المشروع الصحيح
  .setKey(process.env.APPWRITE_API_KEY); // وضع مفتاح الـ API الصحيح

const database = client.database; // استخدام database مباشرة بدون الحاجة إلى constructor

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

// دالة لتخزين البيانات في Appwrite
async function storeDataInAppwrite(data) {
    let success = true;
    let errorMessages = [];
    let storedDataCount = 0;
    
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
        const row = data[rowIndex];
        
        // تحقق من أن الصف يحتوي على 12 خلية
        if (row.length < 12) {
            errorMessages.push(`الصف ${rowIndex + 1} يحتوي على بيانات غير كاملة.`);
            continue;
        }

        // بناء المستند الذي سيتم تخزينه
        const document = {
            Device: row[0] || null,
            Team: row[1] || null,
            email: row[2] || null,
            Name: row[4] || null,
            Countforallqueues: row[5] || null,
            Quality: row[6] || null,
            Countforeachqueue: row[7] || null,
            QualityperDay: row[8] || null,
            Countpertoday: row[9] || null,
            LastSubmission: row[10] || null,
            lasttask: row[11] || null,
        };

        // تصفية الحقول الفارغة أو غير المقبولة
        const filteredDocument = Object.fromEntries(
            Object.entries(document).filter(([key, value]) => value !== null && value !== "" && value !== "غير مقبول")
        );

        // تحقق من الحقول الأساسية مثل "Device"، "Team"، و"email" وأنها ليست فارغة
        if (!filteredDocument.Device || !filteredDocument.Team || !filteredDocument.email || !filteredDocument.Name) {
            errorMessages.push(`الصف ${rowIndex + 1} يحتوي على بيانات غير كاملة (يجب أن يحتوي على "Device"، "Team"، "email"، "Name").`);
            continue;
        }

        try {
            // تخزين البيانات في Appwrite
            await database.createDocument('672ea3ba002e71c7a82b', filteredDocument);
            storedDataCount++;
        } catch (error) {
            success = false;
            errorMessages.push(`خطأ في تخزين بيانات الصف ${rowIndex + 1}: ${error.message}`);
        }
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
