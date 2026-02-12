// =================================================================
// 報表邏輯 (report.js) - 閱讀合併與統計優化版
// =================================================================

// --- 全域變數 ---
let currentReportDate = new Date();
let currentFilteredRecords = [];

// --- DOM 元素引用 ---
const reportTitleEl = document.getElementById('report-title');
const prevMonthBtn = document.getElementById('prev-month-report');
const nextMonthBtn = document.getElementById('next-month-report');
const exerciseDaysCountEl = document.getElementById('exerciseDaysCount');
const readingDaysCountEl = document.getElementById('readingDaysCount');
const totalReadingTimeEl = document.getElementById('totalReadingTime');
const readingBookListEl = document.getElementById('readingBookList');
const exportCsvButton = document.getElementById('export-csv-button');

// 圖表實例容器
let weightChartInstance = null;
let waterChartInstance = null;
let sleepChartInstance = null;

const MORANDI_COLORS = {
    PRIMARY: '#85A7C4',
    WEIGHT: '#E0C793',
    WATER: '#A2B9BC',
    SLEEP: ['#D29A9A', '#E0C793', '#85A7C4', '#B5C4AE'] // 差, 普通, 好, 很棒
};

/**
 * 處理月份數據：包含體重、飲水、睡眠，以及最重要的「閱讀合併」
 */
function processMonthlyData(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}-`;

    const records = getRecords();
    const monthlyRecords = records.filter(r => r.date.startsWith(monthPrefix));

    const data = {
        weight: new Array(daysInMonth).fill(null),
        water: new Array(daysInMonth).fill(0),
        sleep: { '差': 0, '普通': 0, '好': 0, '很棒': 0 },
        exerciseDates: new Set(),
        readingDates: new Set(), // 紀錄有閱讀的天數
        totalReadingMinutes: 0,
        bookStats: {} // 用來合併書籍時數的物件 { "書名": 總分鐘 }
    };

    monthlyRecords.forEach(record => {
        const dayIndex = parseInt(record.date.split('-')[2]) - 1;

        if (record.type === 'weight') {
            data.weight[dayIndex] = parseFloat(record.value);
        } else if (record.type === 'water') {
            data.water[dayIndex] += parseInt(record.value);
        } else if (record.type === 'sleep') {
            if (data.sleep.hasOwnProperty(record.value)) data.sleep[record.value]++;
        } else if (record.type === 'exercise') {
            data.exerciseDates.add(record.date);
        } else if (record.type === 'reading') {
            data.readingDates.add(record.date);

            // 使用正則表達式提取「書名」與「分鐘」
            // 格式假設為: "書名 (數字 分鐘)"
            const match = record.value.match(/^(.*?) \((\d+)\s*分鐘\)/);
            if (match) {
                const title = match[1].trim();
                const mins = parseInt(match[2]);

                // 1. 累加全月總時數
                data.totalReadingMinutes += mins;

                // 2. 根據書名合併時數
                if (!data.bookStats[title]) {
                    data.bookStats[title] = 0;
                }
                data.bookStats[title] += mins;
            } else {
                // 如果格式不符，至少保留原內容顯示
                if (!data.bookStats[record.value]) data.bookStats[record.value] = 0;
            }
        }
    });

    // 將合併後的 bookStats 轉為陣列供清單顯示
    data.bookList = Object.keys(data.bookStats).map(title => ({
        title: title,
        totalMins: data.bookStats[title]
    })).sort((a, b) => b.totalMins - a.totalMins); // 按閱讀時間長短排序

    return data;
}

/**
 * 渲染統計數據 (含閱讀總時數)
 */
function renderStats(data) {
    if (exerciseDaysCountEl) exerciseDaysCountEl.textContent = data.exerciseDates.size;
    if (readingDaysCountEl) readingDaysCountEl.textContent = data.readingDates.size;

    if (totalReadingTimeEl) {
        totalReadingTimeEl.innerHTML = `${data.totalReadingMinutes} <span style="font-size: 1rem;">分鐘</span>`;
    }
}

/**
 * 渲染合併後的閱讀書單
 */
function renderBookList(bookList) {
    if (!readingBookListEl) return;
    readingBookListEl.innerHTML = '';

    if (bookList.length === 0) {
        readingBookListEl.innerHTML = '<li class="empty-placeholder">本月暫無閱讀紀錄</li>';
        return;
    }

    bookList.forEach(item => {
        const li = document.createElement('li');
        li.style.padding = '12px 0';
        li.style.borderBottom = '1px dashed #ddd';
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.innerHTML = `
            <span><span class="material-icons" style="font-size:1.1rem; vertical-align:middle; color:#85A7C4;">menu_book</span> ${item.title}</span>
            <span style="color:#666; font-size:0.9rem;">本月累計: ${item.totalMins} 分鐘</span>
        `;
        readingBookListEl.appendChild(li);
    });
}

// --- 圖表渲染 (使用 Chart.js) ---

function renderWeightChart(dataArray, daysInMonth) {
    const ctx = document.getElementById('weightChart')?.getContext('2d');
    if (!ctx) return;
    if (weightChartInstance) weightChartInstance.destroy();
    weightChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: daysInMonth}, (_, i) => i + 1),
            datasets: [{
                label: '體重 (kg)',
                data: dataArray,
                borderColor: MORANDI_COLORS.WEIGHT,
                backgroundColor: MORANDI_COLORS.WEIGHT + '33',
                tension: 0.3,
                spanGaps: true,
                fill: true
            }]
        }
    });
}

function renderWaterChart(dataArray, daysInMonth) {
    const ctx = document.getElementById('waterChart')?.getContext('2d');
    if (!ctx) return;
    if (waterChartInstance) waterChartInstance.destroy();
    waterChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({length: daysInMonth}, (_, i) => i + 1),
            datasets: [{
                label: '飲水量 (ml)',
                data: dataArray,
                backgroundColor: MORANDI_COLORS.WATER
            }]
        }
    });
}

function renderSleepChart(sleepData) {
    const ctx = document.getElementById('sleepChart')?.getContext('2d');
    if (!ctx) return;
    if (sleepChartInstance) sleepChartInstance.destroy();
    sleepChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['差', '普通', '好', '很棒'],
            datasets: [{
                data: [sleepData['差'], sleepData['普通'], sleepData['好'], sleepData['很棒']],
                backgroundColor: MORANDI_COLORS.SLEEP
            }]
        }
    });
}

// --- 導航與初始化 ---

function renderReport() {
    const year = currentReportDate.getFullYear();
    const month = currentReportDate.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();

    reportTitleEl.textContent = `${year}年 ${month}月 統計報表`;

    const monthlyData = processMonthlyData(currentReportDate);

    // 儲存當月過濾後的原始資料供 CSV 匯出
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}-`;
    currentFilteredRecords = getRecords().filter(r => r.date.startsWith(monthPrefix));

    renderWeightChart(monthlyData.weight, daysInMonth);
    renderWaterChart(monthlyData.water, daysInMonth);
    renderSleepChart(monthlyData.sleep);
    renderStats(monthlyData);
    renderBookList(monthlyData.bookList);
}

function exportToCSV() {
    if (currentFilteredRecords.length === 0) {
        alert('沒有資料可供匯出');
        return;
    }
    let csvContent = "\uFEFF日期,類型,內容,單位\n";
    currentFilteredRecords.forEach(r => {
        csvContent += `${r.date},${r.type},"${r.value}",${r.unit || ''}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `生活日誌報表_${reportTitleEl.textContent}.csv`;
    link.click();
}

window.onload = function() {
    // 取得 URL 傳來的日期參數
    const urlParams = new URLSearchParams(window.location.search);
    const dateStr = urlParams.get('date');
    if (dateStr) currentReportDate = new Date(dateStr);

    renderReport();

    if (prevMonthBtn) prevMonthBtn.onclick = () => { currentReportDate.setMonth(currentReportDate.getMonth() - 1); renderReport(); };
    if (nextMonthBtn) nextMonthBtn.onclick = () => { currentReportDate.setMonth(currentReportDate.getMonth() + 1); renderReport(); };
    if (exportCsvButton) exportCsvButton.onclick = exportToCSV;
};
