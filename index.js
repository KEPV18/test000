<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>نقل البيانات من Google Sheets إلى Appwrite</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100">
    <div class="container mx-auto px-4 py-8">
        <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <h1 class="text-2xl font-bold text-center mb-6">نقل البيانات من Google Sheets إلى Appwrite</h1>
            
            <div class="space-y-4">
                <div id="status" class="text-center text-gray-600">
                    جاهز لنقل البيانات
                </div>
                
                <button 
                    id="fetchButton"
                    class="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                    onclick="fetchData()"
                >
                    بدء نقل البيانات
                </button>
            </div>
        </div>
    </div>

    <script>
        async function fetchData() {
            const button = document.getElementById('fetchButton');
            const status = document.getElementById('status');
            
            try {
                button.disabled = true;
                status.textContent = 'جاري نقل البيانات...';
                status.className = 'text-center text-blue-600';

                const response = await fetch('/.netlify/functions/fetch-data');
                const data = await response.json();

                if (response.ok) {
                    status.textContent = 'تم نقل البيانات بنجاح!';
                    status.className = 'text-center text-green-600';
                } else {
                    throw new Error(data.message || 'حدث خطأ أثناء نقل البيانات');
                }
            } catch (error) {
                status.textContent = error.message;
                status.className = 'text-center text-red-600';
            } finally {
                button.disabled = false;
            }
        }
    </script>
</body>
</html>