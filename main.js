// =================================================================
// 應用程式核心邏輯 (main.js) - 手機/電腦全相容優化版
// =================================================================

let currentDate = new Date(); 
let selectedDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

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
const reportButton = document.getElementById('report-button'); 

// --- 日曆渲染 ---
function renderCalendar(date) {
    const calendarGrid = document.querySelector('.calendar-grid');
    if (!calendarGrid) return;

    currentMonthYearEl.textContent = `${date.getFullYear()}年 ${date.getMonth() + 1}月`;

    while (calendarGrid.children.length > 7) {
        calendarGrid.removeChild(calendarGrid.children[7]);
    }

    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const records = getRecords();
    const recordsByDate = groupRecordsByDate(records);

    for (let i = 0; i < firstDayOfMonth; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell inactive';
        calendarGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'day-cell';
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dayCell.setAttribute('data-date', dateKey);

        const dayContent = document.createElement('div');
        dayContent.textContent = day;
        dayCell.appendChild(dayContent);

        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        if (dateKey === todayKey) dayCell.classList.add('today');
        if (dateKey === selectedDateStr) dayCell.classList.add('selected');

        if (recordsByDate[dateKey]) {
            const dotsContainer = document.createElement('div');
            dotsContainer.className = 'record-dots';
            const uniqueTypes = [...new Set(recordsByDate[dateKey].map(r => r.type))];
            uniqueTypes.forEach(type => {
                const dot = document.createElement('span');
                dot.className = `dot ${type}`;
                dotsContainer.appendChild(dot);
            });
            dayCell.appendChild(dotsContainer);
        }

        // 修正點擊事件綁定
        dayCell.addEventListener('click', handleDayClick);
        calendarGrid.appendChild(dayCell);
    }
    displayDailySummary(selectedDateStr);
}

function groupRecordsByDate(records) {
    return records.reduce((acc, record) => {
        const dateKey = record.date;
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(record);
        return acc;
    }, {});
}

function handleDayClick(event) {
    const dateString = event.currentTarget.getAttribute('data-date');
    selectedDateStr = dateString;
    document.querySelectorAll('.day-cell').forEach(cell => cell.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    displayDailySummary(selectedDateStr);
}

// --- 總結與圖卡 ---
function displayDailySummary(dateString) {
    const [y, m, d] = dateString.split('-').map(Number);
    summaryTitleEl.textContent = `${m}月${d}日的紀錄`;
    summaryContentEl.innerHTML = '';

    const records = getRecords();
    const dailyRecords = records.filter(r => r.date === dateString);

    if (dailyRecords.length === 0) {
        summaryContentEl.innerHTML = '<div class="empty">今天還沒有紀錄喔！</div>';
    } else {
        const finalRecordsToShow = [];
        const latestOnlyTypes = ['weight', 'sleep'];
        const latestTracker = {};

        dailyRecords.forEach(record => {
            if (latestOnlyTypes.includes(record.type)) {
                latestTracker[record.type] = record;
            } else {
                finalRecordsToShow.push(record);
            }
        });

        Object.values(latestTracker).forEach(r => finalRecordsToShow.push(r));
        finalRecordsToShow.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        finalRecordsToShow.forEach(record => {
            const card = document.createElement('div');
            card.className = `summary-card card-${record.type}`;
            card.addEventListener('click', () => openContextMenuModal(record.id, record.type));
            card.innerHTML = `
                <div class="summary-card-icon"><span class="material-icons">${getIconName(record.type)}</span></div>
                <div class="summary-card-details">
                    <p class="summary-card-title">${getCardTitle(record.type)}</p>
                    <p class="summary-card-value">${record.value} ${record.unit || ''}</p>
                </div>
            `;
            summaryContentEl.appendChild(card);
        });
    }
}

function getCardTitle(type) {
    const titles = {'weight': '體重', 'water': '飲水', 'sleep': '睡眠', 'exercise': '運動', 'reading': '閱讀'};
    return titles[type] || '紀錄';
}

function getIconName(type) {
    const icons = {'weight': 'monitor_weight', 'water': 'water_drop', 'sleep': 'bedtime', 'exercise': 'directions_run', 'reading': 'book'};
    return icons[type] || 'notes';
}

// --- Modal 邏輯 ---
function openRecordModal(type) {
    recordForm.setAttribute('data-current-type', type);
    modalFormContent.innerHTML = generateFormHtml(type);
    document.getElementById('modal-title').innerText = `新增${getCardTitle(type)}紀錄`;
    recordModal.style.display = 'flex';
    if (fabMenu) fabMenu.style.display = 'none'; // 手機點擊後立刻收起選單
}

function closeRecordModal() {
    recordModal.style.display = 'none';
    recordForm.reset();
}

function generateFormHtml(type) {
    switch (type) {
        case 'weight': return `<label>體重 (kg)</label><input type="number" step="0.1" id="record-weight-value" required>`;
        case 'water': return `<label>飲水量 (ml)</label><input type="number" id="record-water-value" required>`;
        case 'sleep':
            let sHtml = '<label>睡眠品質</label><div class="choice-group">';
            ['差', '普通', '好', '很棒'].forEach(k => {
                sHtml += `<input type="radio" id="sleep-${k}" name="sleep-quality" value="${k}" required><label for="sleep-${k}" class="choice-label">${k}</label>`;
            });
            return sHtml + '</div>';
        case 'exercise':
            let eHtml = '<label>運動類型</label><div class="choice-group">';
            ['腿', '背', '胸', '肩', '有氧', '拉伸'].forEach(o => {
                eHtml += `<input type="checkbox" id="exercise-${o}" name="exercise-type" value="${o}"><label for="exercise-${o}" class="choice-label">${o}</label>`;
            });
            return eHtml + '</div>';
        case 'reading':
            return `<label>書名</label><input type="text" id="record-reading-title" required placeholder="書名">
                    <label>閱讀時間 (分鐘)</label><input type="number" id="record-reading-time" min="1" required>`;
        default: return '';
    }
}

// --- 事件初始化 ---
window.onload = function() {
    renderCalendar(currentDate);

    // 月份切換
    document.getElementById('prev-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(currentDate); });
    document.getElementById('next-month').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(currentDate); });
    
    // 備份與報表
    const backupBtn = document.getElementById('backup-button');
    if (backupBtn) backupBtn.addEventListener('click', () => { if (confirm('確定下載備份檔？')) exportAllData(); });
    if (reportButton) reportButton.addEventListener('click', () => window.open(`report.html?date=${selectedDateStr}`, '_blank'));

    // CSV 匯入
    const csvInput = document.getElementById('csv-upload');
    if (csvInput) csvInput.addEventListener('change', handleCsvImport);

    // FAB 選單 (優化點擊)
    if (fabButton) {
        fabButton.addEventListener('click', (e) => {
            e.stopPropagation();
            fabMenu.style.display = (fabMenu.style.display === 'block') ? 'none' : 'block';
        });
    }

    if (fabMenu) {
        fabMenu.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.getAttribute('data-type');
                openRecordModal(type);
            });
        });
    }

    // Modal 關閉按鈕
    const closeModalBtn = document.getElementById('close-modal-btn');
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeRecordModal);

    // 點擊 Modal 外部關閉
    window.addEventListener('click', (e) => {
        if (e.target === recordModal) closeRecordModal();
        if (e.target === contextMenuModal) closeContextMenuModal();
        // 點擊畫面其他地方也收起 FAB 選單
        if (fabMenu && e.target !== fabButton && !fabMenu.contains(e.target)) {
            fabMenu.style.display = 'none';
        }
    });

    if (recordForm) {
        recordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const type = recordForm.getAttribute('data-current-type');
            let value = '', unit = '';

            if (type === 'weight') { value = document.getElementById('record-weight-value').value; unit = 'kg'; }
            else if (type === 'water') { value = document.getElementById('record-water-value').value; unit = 'ml'; }
            else if (type === 'sleep') { value = document.querySelector('input[name="sleep-quality"]:checked')?.value; unit = '品質'; }
            else if (type === 'exercise') { value = Array.from(document.querySelectorAll('input[name="exercise-type"]:checked')).map(cb => cb.value).join(', '); unit = '部位'; }
            else if (type === 'reading') {
                const t = document.getElementById('record-reading-title').value;
                const m = document.getElementById('record-reading-time').value;
                value = `${t} (${m} 分鐘)`;
                unit = '本書';
            }

            saveNewRecord({ date: selectedDateStr, type, value, unit });
            closeRecordModal();
            renderCalendar(currentDate);
        });
    }
};

// --- 輔助函式 ---
function openContextMenuModal(recordId, recordType) {
    if (!contextMenuContent) return;
    contextMenuContent.innerHTML = `
        <button class="delete-btn" id="confirm-delete-btn">刪除紀錄</button>
        <button id="cancel-context-btn">取消</button>`;
    
    document.getElementById('confirm-delete-btn').onclick = () => {
        if (confirm(`確定刪除？`)) { deleteRecord(recordId); closeContextMenuModal(); renderCalendar(currentDate); }
    };
    document.getElementById('cancel-context-btn').onclick = closeContextMenuModal;
    
    contextMenuModal.style.display = 'flex';
}

function closeContextMenuModal() { if (contextMenuModal) contextMenuModal.style.display = 'none'; }

function handleCsvImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n');
        let records = getRecords();
        let lastId = records.length > 0 ? Math.max(...records.map(r => r.id)) : 0;
        let importCount = 0;
        const typeMap = { '體重': 'weight', '飲水': 'water', '睡眠': 'sleep', '運動': 'exercise', '閱讀': 'reading' };
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].trim();
            if (!row) continue;
            const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (columns.length >= 4) {
                const date = columns[1].trim();
                const type = typeMap[columns[2].trim().replace(/^"|"$/g, '')] || columns[2].trim();
                let value = columns[3].trim().replace(/^"|"$/g, ''); 
                const unit = columns[4] ? columns[4].trim().replace(/^"|"$/g, '') : '';
                if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    lastId++;
                    records.push({ id: lastId, timestamp: Date.now() + importCount, date, type, value, unit });
                    importCount++;
                }
            }
        }
        if (importCount > 0) { saveRecords(records); alert(`已匯入 ${importCount} 筆！`); currentDate = new Date(2026, 0, 1); renderCalendar(currentDate); }
    };
    reader.readAsText(file);
}
