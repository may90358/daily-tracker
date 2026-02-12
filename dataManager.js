// =================================================================
// 數據管理層 (dataManager.js) - 強化備份版本
// =================================================================

const STORAGE_KEY = 'dailyTrackerRecords';
const BACKUP_CHECK_KEY = 'last_backup_month'; // 用來記錄上次提醒備份的月份

function getRecords() {
    try {
        const records = localStorage.getItem(STORAGE_KEY);
        return records ? JSON.parse(records) : [];
    } catch (e) {
        console.error("讀取失敗", e);
        return [];
    }
}

function saveRecords(records) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        checkAndNotifyBackup(); // 每次儲存後檢查是否需要備份
    } catch (e) {
        console.error("寫入失敗", e);
    }
}

// --- 備份核心功能 ---

/**
 * 執行備份：下載所有的資料成 JSON 檔
 */
function exportAllData() {
    const records = getRecords();
    if (records.length === 0) {
        alert("目前沒有資料可以備份喔！");
        return;
    }

    const dataStr = JSON.stringify(records, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const fileName = `全資料備份_${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    
    // 更新最後備份時間，避免重複提醒
    localStorage.setItem(BACKUP_CHECK_KEY, now.getMonth().toString());
    URL.revokeObjectURL(url);
}

/**
 * 檢查是否需要提醒備份 (每個月提醒一次)
 */
function checkAndNotifyBackup() {
    const now = new Date();
    const currentMonth = now.getMonth().toString();
    const lastBackupMonth = localStorage.getItem(BACKUP_CHECK_KEY);

    // 如果這個月還沒備份過
    if (lastBackupMonth !== currentMonth) {
        // 使用 setTimeout 確保在頁面載入完成後才跳出
        setTimeout(() => {
            if (confirm(`【備份提醒】\n新的一個月開始了，建議備份目前的資料以防遺失。\n是否立即下載備份檔？`)) {
                exportAllData();
            } else {
                // 如果使用者按取消，我們下週再提醒他（或是設定為已提醒）
                localStorage.setItem(BACKUP_CHECK_KEY, currentMonth);
            }
        }, 2000);
    }
}

// 基礎 CRUD 函式保持不變...
function getRecordById(id) {
    const records = getRecords();
    return records.find(record => record.id === Number(id)) || null;
}

function saveNewRecord(data) {
    const records = getRecords();
    const newId = records.length > 0 ? Math.max(...records.map(r => r.id)) + 1 : 1;
    const newRecord = { id: newId, timestamp: Date.now(), ...data };
    records.push(newRecord);
    saveRecords(records);
}

function updateExistingRecord(id, newData) {
    const records = getRecords();
    const index = records.findIndex(record => record.id === Number(id));
    if (index !== -1) {
        records[index] = { ...records[index], ...newData };
        saveRecords(records);
    }
}

function deleteRecord(id) {
    let records = getRecords();
    records = records.filter(record => record.id !== Number(id));
    saveRecords(records);
}
