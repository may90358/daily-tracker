// =================================================================
// 應用程式核心邏輯 (main.js) - 完整修正版本
// =================================================================

// --- 全域變數 ---
let currentDate = new Date(); // 用於日曆導航 (月份)
// 確保 selectedDateStr 初始值為今天的日期字串
const year = currentDate.getFullYear();
const month = String(currentDate.getMonth() + 1).padStart(2, '0');
const day = String(currentDate.getDate()).padStart(2, '0');
let selectedDateStr = `${year}-${month}-${day}`;

// --- DOM 元素引用 ---
const currentMonthYearEl = document.getElementById('current-month-year');
const summaryTitleEl = document.getElementById('summary-title');
const summaryContentEl = document.getElementById('summary-content');
const recordModal = document.getElementById('record-modal');
const modalFormContent = document.getElementById('modal-form-content');
const fabButton = document.getElementById('fab-button');
const fabMenu = document.getElementById('fab-menu');
const recordForm = document.getElementById('record-form');
const contextMenuModal = document.getElementById('context-menu-modal');
const contextMenuContent = contextMenuModal ? contextMenuModal.querySelector('.modal-content.context-menu') : null;
const reportButton = document.getElementById('report-button'); // 新增的報表按鈕


// =================================================================
// 1. 日曆渲染和邏輯
// =================================================================

/**
 * 渲染日曆
 */
function renderCalendar(date) {
    const calendarGrid = document.querySelector('.calendar-grid');
    if (!calendarGrid) return;

    // 1. 設定日曆標題
    currentMonthYearEl.textContent = `${date.getFullYear()}年 ${date.getMonth() + 1}月`;

    // 2. 移除舊的日期單元格 (從第8個子元素開始移除，即跳過7個 day-label)
    while (calendarGrid.children.length > 7) {
        calendarGrid.removeChild(calendarGrid.children[7]);
    }

    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 確保 dataManager.js 中的函數在此處可用
    const records = getRecords();
    const recordsByDate = groupRecordsByDate(records);

    // 填充空白日
    for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell inactive';
        calendarGrid.appendChild(emptyCell);
    }

    // 填充當月日期
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';

        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dayCell.setAttribute('data-date', dateKey);

        const dayContent = document.createElement('div');
        dayContent.textContent = day;
        dayCell.appendChild(dayContent);

        // 檢查 Today 狀態
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        if (dateKey === todayKey) {
            dayCell.classList.add('today');
        }

        // 檢查 Selected 狀態
        if (dateKey === selectedDateStr) {
            dayCell.classList.add('selected');
        }

        // 檢查紀錄點 (Dots)
        if (recordsByDate[dateKey]) {
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'record-dots';

            const recordTypes = recordsByDate[dateKey].map(r => r.type);
            const uniqueTypes = [...new Set(recordTypes)];

            uniqueTypes.forEach(type => {
                const dot = document.createElement('span');
                dot.className = `dot ${type}`;
                dotsContainer.appendChild(dot);
            });

            dayCell.appendChild(dotsContainer);
        }

        // 點擊事件
        dayCell.addEventListener('click', handleDayClick);

        calendarGrid.appendChild(dayCell);
    }

    // 初始化顯示每日總結
    displayDailySummary(selectedDateStr);
}

/**
 * 將紀錄按日期分組 (Helper Function)
 */
function groupRecordsByDate(records) {
    return records.reduce((acc, record) => {
        const dateKey = record.date;
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(record);
        return acc;
    }, {});
}

/**
 * 處理日曆日期點擊事件
 */
function handleDayClick(event) {
    const dayCell = event.currentTarget;
    const dateString = dayCell.getAttribute('data-date');
    if (!dateString) return;

    // 清除所有日期的 selected 狀態
    document.querySelectorAll('.day-cell').forEach(cell => {
        cell.classList.remove('selected');
    });

    selectedDateStr = dateString;

    dayCell.classList.add('selected');

    // 重新渲染當日總結
    displayDailySummary(selectedDateStr);
}

// =================================================================
// 2. 每日總結渲染 (Summary Display)
// =================================================================

/**
 * 顯示選定日期的每日紀錄總結
 */
function displayDailySummary(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);

    summaryTitleEl.textContent = `${month}月${day}日的紀錄`;
    summaryContentEl.innerHTML = '';

    const records = getRecords();
    const recordsByDate = groupRecordsByDate(records);

    const dailyRecords = recordsByDate[dateString] || [];

    if (dailyRecords.length === 0) {
        summaryContentEl.classList.add('empty');
        summaryContentEl.textContent = '今天還沒有紀錄喔！';
    } else {
        summaryContentEl.classList.remove('empty');

        const latestRecords = dailyRecords.reduce((acc, record) => {
            // 只保留最新的一筆同類型紀錄
            acc[record.type] = record;
            return acc;
        }, {});

        Object.values(latestRecords).forEach(record => {
            const card = document.createElement('div');

            card.className = `summary-card card-${record.type}`;
            card.setAttribute('data-record-id', record.id);
            card.setAttribute('data-record-type', record.type);
            card.addEventListener('click', () => openContextMenuModal(record.id, record.type));

            card.innerHTML = `
                <div class="summary-card-icon">
                    <span class="material-icons">${getIconName(record.type)}</span>
                </div>
                <div class="summary-card-details">
                    <p class="summary-card-title">${getCardTitle(record.type)}</p>
                    <p class="summary-card-value">${record.value} ${record.unit || ''}</p>
                </div>
            `;
            summaryContentEl.appendChild(card);
        });
    }
}

// Helper: 獲取卡片標題
function getCardTitle(type) {
    const titles = {
        'weight': '體重', 'water': '飲水', 'sleep': '睡眠',
        'exercise': '運動', 'reading': '閱讀'
    };
    return titles[type] || '紀錄';
}

// Helper: 獲取 Google Material Icon 名稱
function getIconName(type) {
    const icons = {
        'weight': 'monitor_weight', 'water': 'water_drop', 'sleep': 'bedtime',
        'exercise': 'directions_run', 'reading': 'book'
    };
    return icons[type] || 'notes';
}


// =================================================================
// 3. 浮動按鈕 (FAB) 和 Modal 處理
// =================================================================

/**
 * 打開紀錄 Modal
 */
function openRecordModal(type) {
    recordForm.setAttribute('data-current-type', type);

    if (modalFormContent) {
        // 使用修正後的 generateFormHtml
        modalFormContent.innerHTML = generateFormHtml(type);
    } else {
        console.error("錯誤: 找不到 modal-form-content 容器!");
        return;
    }

    const saveBtn = recordForm.querySelector('.save-btn');
    saveBtn.setAttribute('data-mode', 'new');
    saveBtn.removeAttribute('data-record-id');
    document.getElementById('modal-title').innerText = `新增${getCardTitle(type)}紀錄`;

    recordModal.style.display = 'flex';
    if (fabMenu) fabMenu.style.display = 'none';

    // 確保取消按鈕能正確關閉 Modal
    const cancelBtn = recordForm.querySelector('.cancel-btn');
    if (cancelBtn) {
        cancelBtn.onclick = null;
        cancelBtn.addEventListener('click', closeRecordModal);
    }
}

/**
 * 關閉紀錄 Modal
 */
function closeRecordModal() {
    recordModal.style.display = 'none';
    document.getElementById('record-form').reset();
    recordForm.removeAttribute('data-current-type');
}

/**
 * 動態生成表單 HTML (使用 choice-group 實現膠囊樣式)
 */
function generateFormHtml(type) {
    let htmlContent = '';

    switch (type) {
        case 'weight':
            htmlContent = `
                <label for="record-weight-value">體重 (kg)</label>
                <input type="number" step="0.1" id="record-weight-value" required>
            `;
            break;
        case 'water':
            htmlContent = `
                <label for="record-water-value">飲水量 (ml)</label>
                <input type="number" id="record-water-value" required>
            `;
            break;
        case 'sleep':
            const sleepOptions = {
                '差': '差', '普通': '普通', '好': '好', '很棒': '很棒'
            };
            // 統一使用 choice-group/choice-label
            htmlContent = '<label>睡眠品質</label><div class="choice-group">';
            for (const key in sleepOptions) {
                htmlContent += `
                    <input type="radio" id="sleep-${key}" name="sleep-quality" value="${key}" required>
                    <label for="sleep-${key}" class="choice-label">${sleepOptions[key]}</label>
                `;
            }
            htmlContent += '</div>';
            break;
        case 'exercise':
            const exerciseOptions = [
                '腿', '背', '胸', '肩', '有氧', '拉伸'
            ];
            // 統一使用 choice-group/choice-label
            htmlContent = '<label>運動部位/類型 (可多選)</label><div class="choice-group">';
            exerciseOptions.forEach(option => {
                htmlContent += `
                    <input type="checkbox" id="exercise-${option}" name="exercise-type" value="${option}">
                    <label for="exercise-${option}" class="choice-label">${option}</label>
                `;
            });
            htmlContent += '</div>';
            break;
        case 'reading':
            htmlContent = `
                <label for="record-reading-title">書名</label>
                <input type="text" id="record-reading-title" required placeholder="請輸入書名">
                <label for="record-reading-time">閱讀時間 (分鐘)</label>
                <input type="number" id="record-reading-time" min="1" required>
            `;
            break;
        default:
            return '';
    }
    return htmlContent;
}

// =================================================================
// 4. 編輯和刪除邏輯 (UI 部分)
// =================================================================

/**
 * 顯示上下文選單 Modal。
 */
function openContextMenuModal(recordId, recordType) {
    if (!contextMenuContent) return;

    // 清除舊內容
    contextMenuContent.innerHTML = '';

    contextMenuContent.innerHTML = `
        <button onclick="startEditRecord(${recordId})">編輯</button>
        <button class="delete-btn" onclick="confirmDelete(${recordId}, '${getCardTitle(recordType)}')">刪除</button>
        <button onclick="closeContextMenuModal()">取消</button>
    `;

    contextMenuModal.style.display = 'flex';
}

/**
 * 關閉上下文選單 Modal。
 */
function closeContextMenuModal() {
    if (contextMenuModal) {
        contextMenuModal.style.display = 'none';
    }
}

/**
 * 彈出刪除確認框，然後呼叫 dataManager 中的 deleteRecord。
 */
function confirmDelete(recordId, recordTitle) {
    // 確保 dataManager.js 中的函數在此處可用
    if (confirm(`確定要刪除這筆 ${recordTitle} 紀錄嗎？`)) {
        deleteRecord(recordId);
        closeContextMenuModal();
        renderCalendar(currentDate);
        displayDailySummary(selectedDateStr);
    } else {
        closeContextMenuModal();
    }
}

/**
 * 啟動編輯模式：載入數據並顯示主 Modal。
 */
function startEditRecord(recordId) {
    // 確保 dataManager.js 中的函數在此處可用
    const recordToEdit = getRecordById(recordId);
    if (!recordToEdit) return;

    closeContextMenuModal();

    const type = recordToEdit.type;
    openRecordModal(type);

    const saveBtn = recordForm.querySelector('.save-btn');
    saveBtn.setAttribute('data-mode', 'edit');
    saveBtn.setAttribute('data-record-id', recordId);
    document.getElementById('modal-title').innerText = `編輯${getCardTitle(type)}紀錄`;

    // 填充表單值
    switch (type) {
        case 'weight':
            document.getElementById('record-weight-value').value = recordToEdit.value;
            break;
        case 'water':
            document.getElementById('record-water-value').value = recordToEdit.value;
            break;
        case 'sleep':
            const sleepRadio = document.getElementById(`sleep-${recordToEdit.value}`);
            if (sleepRadio) sleepRadio.checked = true;
            break;
        case 'exercise':
            // 解析 value 字串 (e.g., "腿, 背")
            const savedExercises = recordToEdit.value.split(',').map(item => item.trim());
            savedExercises.forEach(exercise => {
                const checkbox = document.getElementById(`exercise-${exercise}`);
                if (checkbox) checkbox.checked = true;
            });
            break;
        case 'reading':
            // 解析 value 字串，例如 "書名 (60 分鐘)"
            const match = recordToEdit.value.match(/(.*) \((\d+) 分鐘\)/);
            if (match) {
                document.getElementById('record-reading-title').value = match[1].trim();
                document.getElementById('record-reading-time').value = match[2];
            }
            break;
    }
}

/**
 * 處理表單提交（儲存或更新）。
 */
function handleFormSubmit(e) {
    e.preventDefault();

    const currentFormType = recordForm.getAttribute('data-current-type');
    if (!currentFormType) {
        console.error('無法識別紀錄類型！');
        return;
    }

    const saveBtn = recordForm.querySelector('.save-btn');
    const mode = saveBtn.getAttribute('data-mode') || 'new';
    const recordId = saveBtn.getAttribute('data-record-id');

    let value = '';
    let unit = '';

    // --- 數據提取和驗證 ---
    switch (currentFormType) {
        case 'weight':
            value = document.getElementById('record-weight-value').value;
            unit = 'kg';
            if (value === '' || isNaN(Number(value)) || Number(value) <= 0) {
                 alert('請輸入有效的體重數值 (需大於 0)！'); return;
            }
            break;
        case 'water':
            value = document.getElementById('record-water-value').value;
            unit = 'ml';
            if (value === '' || isNaN(Number(value)) || Number(value) <= 0) {
                 alert('請輸入有效的飲水數值 (需大於 0)！'); return;
            }
            break;
        case 'sleep':
            const selectedSleep = document.querySelector('input[name="sleep-quality"]:checked');
            value = selectedSleep ? selectedSleep.value : '';
            unit = '品質';
            if (value === '') {
                 alert('請選擇睡眠品質！'); return;
            }
            break;
        case 'exercise':
            const selectedExercises = Array.from(document.querySelectorAll('input[name="exercise-type"]:checked'))
                                         .map(cb => cb.value);
            value = selectedExercises.join(', ');
            unit = '部位';
            if (value === '') {
                 alert('請至少選擇一項運動類型！'); return;
            }
            break;
        case 'reading':
            const title = document.getElementById('record-reading-title').value;
            const time = document.getElementById('record-reading-time').value;

            if (!title || !time || isNaN(Number(time)) || Number(time) <= 0) {
                alert('請輸入有效的書名和閱讀時間 (需大於 0)！'); return;
            }
            value = `${title} (${time} 分鐘)`;
            unit = '本書';
            break;
        default:
            return;
    }

    const newData = {
        date: selectedDateStr,
        type: currentFormType,
        value: value,
        unit: unit,
    };

    // 確保 dataManager.js 中的函數在此處可用
    if (mode === 'edit' && recordId) {
        updateExistingRecord(recordId, newData);
    } else {
        saveNewRecord(newData);
    }

    // 重置 Modal 狀態並更新 UI
    closeRecordModal();
    renderCalendar(currentDate);
    displayDailySummary(selectedDateStr);
}


// =================================================================
// 5. 事件監聽器和初始化
// =================================================================

window.onload = function() {
    // 初始渲染
    renderCalendar(currentDate);

    // 日曆導航
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(currentDate);
    });

    document.getElementById('next-month').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(currentDate);
    });

    // 報表按鈕點擊事件 (新增)
    if (reportButton) {
        reportButton.addEventListener('click', () => {
            // 開啟一個新頁面進行報表分析，並傳遞當前選定日期
            window.open(`report.html?date=${selectedDateStr}`, '_blank');
        });
    }

    // FAB 按鈕開關選單
    if (fabButton) {
        fabButton.addEventListener('click', () => {
            if (fabMenu) fabMenu.style.display = fabMenu.style.display === 'block' ? 'none' : 'block';
        });
    }

    // FAB 選單項目點擊
    if (fabMenu) {
        fabMenu.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', (e) => {
                const type = e.target.getAttribute('data-type');
                if (type) openRecordModal(type);
            });
        });
    }

    // Modal 外部點擊關閉
    if (recordModal) {
        recordModal.addEventListener('click', (e) => {
            if (e.target === recordModal) {
                closeRecordModal();
            }
        });
    }

    // 上下文選單外部點擊關閉
    if (contextMenuModal) {
        contextMenuModal.addEventListener('click', (e) => {
            if (e.target === contextMenuModal) {
                closeContextMenuModal();
            }
        });
    }

    // 綁定儲存事件到表單提交
    if (recordForm) {
        recordForm.addEventListener('submit', handleFormSubmit);
    }
};
