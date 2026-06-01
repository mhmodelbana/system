// وظائف مساعدة عامة
const getCurrencySymbol = () => {
    const settings = Storage.get('settings') || {};
    return settings.currency || 'ج.م';
};

const formatCurrency = (value) => {
    const amount = parseFloat(value);
    return `${Number.isNaN(amount) ? '0.00' : amount.toFixed(2)} ${getCurrencySymbol()}`;
};

const formatDate = (value, withTime = false) => {
    const date = value instanceof Date ? value : new Date(value);
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return withTime ? date.toLocaleString('ar-SA') : date.toLocaleDateString('ar-SA');
};

// توليد رقم باركود تلقائيًا بناءً على البادئة في الإعدادات
const generateBarcodeNumber = () => {
    const settings = Storage.get('settings') || {};
    const prefix = settings.barcodePrefix || '100';
    const t = Date.now().toString().slice(-6);
    const r = Math.floor(Math.random() * 900 + 100).toString();
    return `${prefix}${t}${r}`;
};

// توليد صورة باركود بسيطة كـ dataURL (رسمي: ليست ترميزًا قياسيًا لكن مظهرها باركود)
const generateBarcodeDataUrl = (value, barWidth = 2, barHeight = 60) => {
    const canvas = document.createElement('canvas');
    const cols = value.length * 8; // 8 bits per char
    canvas.width = cols * barWidth;
    canvas.height = barHeight + 30;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // draw bars
    let x = 0;
    for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        for (let b = 0; b < 8; b++) {
            const bit = (code >> (7 - b)) & 1;
            ctx.fillStyle = bit ? '#000' : '#fff';
            ctx.fillRect(x, 0, barWidth, barHeight);
            x += barWidth;
        }
        // small gap between chars
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, 0, barWidth * 2, barHeight);
        x += barWidth * 2;
    }

    // draw text underneath
    ctx.fillStyle = '#000';
    ctx.font = '14px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(value, canvas.width / 2, barHeight + 20);

    return canvas.toDataURL('image/png');
};

const downloadFile = (filename, content, type) => {
    const blob = new Blob([content], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const convertToCsv = (rows, headers) => {
    const escapeValue = (value) => {
        if (value == null) return '';
        const str = String(value).replace(/"/g, '""');
        return `"${str}"`;
    };
    const headerRow = headers.map(escapeValue).join(',');
    const dataRows = rows.map(row => headers.map(h => escapeValue(row[h])).join(','));
    return [headerRow, ...dataRows].join('\r\n');
};

const downloadCsv = (filename, rows, headers) => {
    const csv = convertToCsv(rows, headers);
    downloadFile(filename, csv, 'text/csv;charset=utf-8;');
};

const downloadExcel = (filename, htmlTable) => {
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${htmlTable}</body></html>`;
    downloadFile(filename, fullHtml, 'application/vnd.ms-excel');
};
