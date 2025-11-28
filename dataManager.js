// =================================================================
// 數據管理層 (dataManager.js)
// 負責所有數據的持久化、讀取、新增、更新和刪除。
// 使用 localStorage 進行簡單的瀏覽器儲存。
// =================================================================

// 儲存在 localStorage 中的 key 名稱
const STORAGE_KEY = 'dailyTrackerRecords';

/**
 * 獲取所有紀錄。
 * @returns {Array} - 紀錄列表。
 */
function getRecords() {
    try {
        const records = localStorage.getItem(STORAGE_KEY);
        return records ? JSON.parse(records) : [];
    } catch (e) {
        console.error("Error reading from localStorage", e);
        return [];
    }
}

/**
 * 將紀錄列表儲存到 localStorage。
 * @param {Array} records - 待儲存的紀錄列表。
 */
function saveRecords(records) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
        console.error("Error writing to localStorage", e);
    }
}

/**
 * 根據 ID 獲取單筆紀錄。
 * @param {number} id - 紀錄 ID。
 * @returns {Object|null} - 找到的紀錄物件或 null。
 */
function getRecordById(id) {
    const records = getRecords();
    // 確保 id 是數字以便比對
    return records.find(record => record.id === Number(id)) || null;
}

/**
 * 新增一筆紀錄。
 * @param {Object} data - 紀錄數據 (不包含 id)。
 */
function saveNewRecord(data) {
    const records = getRecords();
    // 生成新的 ID：找到最大 ID + 1，如果沒有紀錄則從 1 開始
    const newId = records.length > 0
        ? Math.max(...records.map(r => r.id)) + 1
        : 1;

    const newRecord = {
        id: newId,
        timestamp: Date.now(),
        ...data
    };
    records.push(newRecord);
    saveRecords(records);
}

/**
 * 更新現有紀錄。
 * @param {number} id - 待更新紀錄的 ID。
 * @param {Object} newData - 新的數據。
 */
function updateExistingRecord(id, newData) {
    const records = getRecords();
    const index = records.findIndex(record => record.id === Number(id));

    if (index !== -1) {
        records[index] = {
            ...records[index], // 保留舊的 ID 和 timestamp
            ...newData         // 覆蓋新的數據 (date, type, value, unit)
        };
        saveRecords(records);
    }
}

/**
 * 刪除一筆紀錄。
 * @param {number} id - 待刪除紀錄的 ID。
 */
function deleteRecord(id) {
    let records = getRecords();
    // 過濾掉與該 ID 不匹配的紀錄
    records = records.filter(record => record.id !== Number(id));
    saveRecords(records);
}

// 導出函數（雖然在瀏覽器腳本環境中非必須，但有利於組織）
// 如果您是使用 <script> 標籤引入，這一步可以省略，函數會自動成為全域變數。
// 如果無法執行，請確認它們是全域可用的。
