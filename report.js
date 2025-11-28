// =================================================================
// 報表邏輯 (report.js) - 完整功能與莫蘭迪色系版
// 負責數據處理、Chart.js 渲染及 CSV 匯出。
// 依賴 dataManager.js (需在 report.html 中先引入)
// =================================================================

// --- 全域變數 ---
let currentReportDate = new Date(); // 用於報表導航
let currentFilteredRecords = [];    // 儲存當月所有原始紀錄，用於匯出

// --- DOM 元素引用 ---
const reportTitleEl = document.getElementById('report-title');
const prevMonthBtn = document.getElementById('prev-month-report');
const nextMonthBtn = document.getElementById('next-month-report');
const exerciseDaysCountEl = document.getElementById('exerciseDaysCount');
const readingDaysCountEl = document.getElementById('readingDaysCount');
const readingBookListEl = document.getElementById('readingBookList');
const exportCsvButton = document.getElementById('export-csv-button'); // 匯出按鈕

// 圖表實例容器 (用於更新圖表)
let weightChartInstance = null;
let waterChartInstance = null;
let sleepChartInstance = null;

// --- 莫蘭迪色系定義 (與 report.css 中的定義保持一致) ---
const MORANDI_COLORS = {
    PRIMARY: '#85A7C4',    // 柔和藍 (主要標題、按鈕)
    WEIGHT: '#E0C793',     // 柔和黃/米色 (體重)
    WATER: '#A2B9BC',      // 柔和青藍 (飲水)
    SLEEP_GOOD: '#B5C4AE', // 柔和綠 (睡眠品質：好/很棒)
    SLEEP_OK: '#E0C793',    // 柔和黃 (睡眠品質：普通)
    SLEEP_BAD: '#D29A9A',   // 柔和紅 (睡眠品質：差)
};

// =================================================================
// 1. 數據處理核心
// =================================================================

/**
 * Helper: 獲取紀錄類型對應的中文標題
 */
function getCardTitle(type) {
    const titles = {
        'weight': '體重', 'water': '飲水', 'sleep': '睡眠',
        'exercise': '運動', 'reading': '閱讀'
    };
    return titles[type] || '紀錄';
}


/**
 * 從 URL 獲取月份參數，否則使用當前月份
 */
function getInitialDate() {
    const urlParams = new URLSearchParams(window.location.search);
    const dateStr = urlParams.get('date');

    if (dateStr) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            currentReportDate = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
            return;
        }
    }
    currentReportDate.setDate(1);
}

/**
 * 獲取並處理指定月份的所有紀錄
 * @param {Date} date - 指定月份的日期物件
 * @returns {Object} - 包含所有數據的彙總物件
 */
function processMonthlyData(date) {
    if (typeof getRecords !== 'function') {
        console.error("dataManager.js 中的 getRecords 函數未載入！");
        return null;
    }
    const allRecords = getRecords();

    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-based month

    // 格式化當月日期字串 (YYYY-MM-)
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}-`;

    const monthlyRecords = allRecords.filter(record =>
        record.date.startsWith(monthPrefix)
    );

    const data = {
        weight: [],
        water: {},
        sleep: { '差': 0, '普通': 0, '好': 0, '很棒': 0 },
        exerciseDays: new Set(),
        readingDays: new Set(),
        bookList: new Set()
    };

    const dailyLatestWeight = {};
    const daysInMonth = new Date(year, month, 0).getDate();

    // 初始化 water 數據
    for (let i = 1; i <= daysInMonth; i++) {
        data.water[i] = 0;
    }

    monthlyRecords.forEach(record => {
        const day = Number(record.date.split('-')[2]);

        switch (record.type) {
            case 'weight':
                const currentWeightTime = dailyLatestWeight[day] ? dailyLatestWeight[day].timestamp : 0;
                // 只保留當日最新的一筆體重紀錄
                if (record.timestamp > currentWeightTime) {
                    dailyLatestWeight[day] = {
                        value: Number(record.value),
                        timestamp: record.timestamp
                    };
                }
                break;
            case 'water':
                // 累加當日飲水量
                data.water[day] += Number(record.value);
                break;
            case 'sleep':
                if (data.sleep.hasOwnProperty(record.value)) {
                    data.sleep[record.value]++;
                }
                break;
            case 'exercise':
                data.exerciseDays.add(day);
                break;
            case 'reading':
                data.readingDays.add(day);
                const match = record.value.match(/(.*) \(\d+ 分鐘\)/);
                const title = match ? match[1].trim() : record.value;
                data.bookList.add(title);
                break;
        }
    });

    // 格式化體重數據
    for (let day = 1; day <= daysInMonth; day++) {
        const weightEntry = dailyLatestWeight[day];
        if (weightEntry) {
            data.weight.push({ day: day, value: weightEntry.value });
        }
    }

    return data;
}

// =================================================================
// 2. 圖表渲染
// =================================================================

/**
 * 繪製體重折線圖
 */
function renderWeightChart(data, daysInMonth) {
    const ctx = document.getElementById('weightChart').getContext('2d');

    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const weightValues = new Array(daysInMonth).fill(null);
    data.forEach(item => {
        weightValues[item.day - 1] = item.value;
    });

    if (weightChartInstance) {
        weightChartInstance.destroy();
    }

    weightChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '體重 (kg)',
                data: weightValues,
                // 應用莫蘭迪色系
                borderColor: MORANDI_COLORS.WEIGHT,
                backgroundColor: `${MORANDI_COLORS.WEIGHT}4D`,
                borderWidth: 2,
                tension: 0.3,
                spanGaps: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    title: {
                        display: true,
                        text: '體重 (kg)'
                    },
                    beginAtZero: false
                },
                x: {
                    title: {
                        display: true,
                        text: '日期'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
}

/**
 * 繪製飲水折線圖
 */
function renderWaterChart(data, daysInMonth) {
    const ctx = document.getElementById('waterChart').getContext('2d');

    const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const waterValues = labels.map(day => data[day]);

    if (waterChartInstance) {
        waterChartInstance.destroy();
    }

    waterChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '飲水量 (ml)',
                data: waterValues,
                // 應用莫蘭迪色系
                borderColor: MORANDI_COLORS.WATER,
                backgroundColor: `${MORANDI_COLORS.WATER}4D`,
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    title: {
                        display: true,
                        text: '飲水量 (ml)'
                    },
                    beginAtZero: true
                },
                x: {
                    title: {
                        display: true,
                        text: '日期'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    });
}

/**
 * 繪製睡眠狀態橫條圖
 */
function renderSleepChart(data) {
    const ctx = document.getElementById('sleepChart').getContext('2d');

    const qualityLabels = ['很棒', '好', '普通', '差'];
    const sleepValues = qualityLabels.map(label => data[label]);

    if (sleepChartInstance) {
        sleepChartInstance.destroy();
    }

    sleepChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: qualityLabels,
            datasets: [{
                label: '紀錄次數',
                // 應用莫蘭迪色系分級
                backgroundColor: [
                    MORANDI_COLORS.SLEEP_GOOD,
                    MORANDI_COLORS.SLEEP_GOOD,
                    MORANDI_COLORS.SLEEP_OK,
                    MORANDI_COLORS.SLEEP_BAD
                ],
                borderColor: '#fff',
                borderWidth: 1,
                data: sleepValues,
            }]
        },
        options: {
            indexAxis: 'y', // 橫條圖
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '紀錄次數'
                    },
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// =================================================================
// 3. 統計和列表渲染
// =================================================================

/**
 * 渲染運動和閱讀的統計數字
 */
function renderStats(data) {
    exerciseDaysCountEl.textContent = `${data.exerciseDays.size} 天`;
    readingDaysCountEl.textContent = `${data.readingDays.size} 天`;
}

/**
 * 渲染閱讀書單
 */
function renderBookList(bookList) {
    readingBookListEl.innerHTML = ''; // 清空列表

    if (bookList.size === 0) {
        readingBookListEl.innerHTML = '<li class="empty-placeholder">本月沒有閱讀紀錄</li>';
        return;
    }

    bookList.forEach(title => {
        const li = document.createElement('li');
        li.textContent = title;
        readingBookListEl.appendChild(li);
    });
}

// =================================================================
// 4. CSV 匯出邏輯
// =================================================================

/**
 * 將給定的資料陣列轉換為 CSV 格式的字串。
 * @param {Array<Object>} data - 紀錄物件陣列。
 * @returns {string} - CSV 格式的字串。
 */
function convertToCsv(data) {
    if (data.length === 0) return '';

    // 1. 定義標頭
    const headers = ['ID', '日期', '類型', '值', '單位', '時間戳'];
    const headerRow = headers.join(',') + '\n';

    // 2. 轉換數據行
    const csvRows = data.map(record => {
        // 處理值中的特殊字符 (例如逗號)，並用雙引號包住
        const cleanValue = (String(record.value) || '').replace(/"/g, '""');

        return [
            record.id,
            record.date,
            getCardTitle(record.type), // 使用中文名稱
            `"${cleanValue}"`,
            record.unit || '',
            new Date(record.timestamp).toLocaleString('zh-TW')
        ].join(',');
    });

    return headerRow + csvRows.join('\n');
}

/**
 * 匯出 CSV 檔案。
 * @param {Array<Object>} records - 待匯出的紀錄列表。
 */
function exportToCsv(records) {
    if (records.length === 0) {
        alert("無紀錄可匯出。");
        return;
    }

    const year = currentReportDate.getFullYear();
    const month = currentReportDate.getMonth() + 1;
    const filename = `生活追蹤報表_${year}年${month}月.csv`;

    const csvString = convertToCsv(records);

    // 加上 UTF-8 BOM 避免 Excel 中文亂碼
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvString], {
        type: 'text/csv;charset=utf-8;'
    });

    // 創建下載連結並觸發點擊
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // 釋放資源
    } else {
        alert('您的瀏覽器不支持自動下載，請嘗試複製數據。');
    }
}


// =================================================================
// 5. 報表主函數和事件監聽
// =================================================================

/**
 * 渲染整個報表頁面
 */
function renderReport() {
    const year = currentReportDate.getFullYear();
    const month = currentReportDate.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();

    // 1. 設定標題
    reportTitleEl.textContent = `${year}年 ${month}月 統計報表`;

    // 2. 處理數據並過濾原始紀錄
    const monthlyData = processMonthlyData(currentReportDate);
    if (!monthlyData) return;

    // 獲取當前月份的所有原始紀錄並儲存，用於 CSV 匯出
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}-`;
    const allRecords = getRecords();
    currentFilteredRecords = allRecords.filter(record => record.date.startsWith(monthPrefix));

    // 3. 渲染圖表
    renderWeightChart(monthlyData.weight, daysInMonth);
    renderWaterChart(monthlyData.water, daysInMonth);
    renderSleepChart(monthlyData.sleep);

    // 4. 渲染統計
    renderStats(monthlyData);

    // 5. 渲染書單
    renderBookList(monthlyData.bookList);
}

/**
 * 月份導航處理
 */
function handleMonthChange(direction) {
    currentReportDate.setMonth(currentReportDate.getMonth() + direction);
    renderReport();
}


window.onload = function() {
    // 1. 獲取初始日期
    getInitialDate();

    // 2. 首次渲染報表
    renderReport();

    // 3. 事件監聽
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => handleMonthChange(-1));
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => handleMonthChange(1));

    // 4. CSV 匯出按鈕事件
    if (exportCsvButton) {
        exportCsvButton.addEventListener('click', () => {
            // 使用之前儲存的當前月份過濾後的全量數據
            exportToCsv(currentFilteredRecords);
        });
    }
};
