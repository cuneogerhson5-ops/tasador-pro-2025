function doGet(e) {
var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action).trim().toLowerCase() : "";
if (action === "tariffs") return getTariffs_();
if (action === "validate") return validateLicense_(e);
return json_({ error: "unknown action" });
}
function getTariffs_() {
var ss = SpreadsheetApp.getActive();
var sh = ss.getSheetByName('tariafs');
if (!sh) return json_({ error: 'Sheet tariafs not found' });

var values = sh.getDataRange().getValues();
if (values.length < 2) return json_([]);

var headers = values.map(function(h) { return String(h).trim(); });
var idx = {
tipo: headers.indexOf('tipo'),
distrito: headers.indexOf('distrito'),
subzona: headers.indexOf('subzona'),
valorM2: headers.indexOf('valorM2')
};
if (idx.tipo < 0 || idx.distrito < 0 || idx.subzona < 0 || idx.valorM2 < 0) {
return json_({ error: 'Missing required headers: tipo, distrito, subzona, valorM2' });
}

var out = [];
for (var i = 1; i < values.length; i++) {
var row = values[i];
var tipo = safeText_(row[idx.tipo]);
var distrito = safeText_(row[idx.distrito]);
var subzona = safeText_(row[idx.subzona]);
var v = row[idx.valorM2];
var valorNum = Number(v);
if (!tipo || !distrito || !subzona) continue;
if (!isFinite(valorNum)) continue;
out.push({ tipo: tipo, distrito: distrito, subzona: subzona, valorM2: valorNum });
}

return json_(out);
}

function validateLicense_(e) {
var ss = SpreadsheetApp.getActive();
var sh = ss.getSheetByName('licencia');
if (!sh) return json_({ valid: false, error: 'Sheet licencia not found' });

var values = sh.getDataRange().getValues();
if (values.length < 2) return json_({ valid: false, error: 'No licenses' });

var headers = values.map(function(h) { return String(h).trim(); });
var idx = {
licenseId: headers.indexOf('licenseId'),
email: headers.indexOf('email'),
activatedAt: headers.indexOf('activatedAt'),
expiresAt: headers.indexOf('expiresAt'),
active: headers.indexOf('active')
};

var qId = (e && e.parameter && e.parameter.licenseId) ? String(e.parameter.licenseId).trim() : '';
var qEmail = (e && e.parameter && e.parameter.email) ? String(e.parameter.email).trim() : '';

for (var i = 1; i < values.length; i++) {
var row = values[i];
var id = idx.licenseId >= 0 ? safeText_(row[idx.licenseId]) : '';
var em = idx.email >= 0 ? safeText_(row[idx.email]) : '';
var activeCell = idx.active >= 0 ? row[idx.active] : '';
var expCell = idx.expiresAt >= 0 ? row[idx.expiresAt] : '';
var match = false;
if (qId && id && qId === id) match = true;
if (!match && qEmail && em && qEmail.toLowerCase() === em.toLowerCase()) match = true;
if (!match) continue;
var isActive = normalizeBool_(activeCell);
var expIso = toIsoDate_(expCell);
return json_({ valid: isActive, expiresAt: expIso });
}

return json_({ valid: false, error: 'License not found' });
}

function json_(obj) {
return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function safeText_(v) {
return String(v == null ? '' : v).trim();
}

function normalizeBool_(v) {
var s = String(v).trim().toLowerCase();
return (s === 'true' || s === '1' || s === 'si' || s === 'sí' || s === 'activo' || s === 'activa');
}

function toIsoDate_(v) {
if (!v) return '';
try {
var d = (v instanceof Date) ? v : new Date(v);
if (isNaN(d.getTime())) return '';
return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
} catch (err) {
return '';
}
}

