// ====== CONFIGURACIÓN ======
// URLs de Apps Script publicados como Web App (doGet/doPost).
// Reemplazar después de desplegar el Apps Script (README explica pasos).
const CONFIG = {
  VALIDATE_LICENSE_URL: "https://script.google.com/macros/s/AKfycbznxyxPJO_vYbfuecUCPrP3VZFj_pOwEHtHXGXZYox_kruKlh_ZjHUa2R6xkqQaEPBz5w/exec?action=validate",
  ISSUE_LICENSE_URL: "https://script.google.com/macros/s/AKfycbznxyxPJO_vYbfuecUCPrP3VZFj_pOwEHtHXGXZYox_kruKlh_ZjHUa2R6xkqQaEPBz5w/exec?action=issue",
  TARIFF_URL: "https://script.google.com/macros/s/AKfycbznxyxPJO_vYbfuecUCPrP3VZFj_pOwEHtHXGXZYox_kruKlh_ZjHUa2R6xkqQaEPBz5w/exec?action=tariffs"
};

// Helpers UI
const qs = (s, el = document) => el.querySelector(s);
const qsa = (s, el = document) => [...el.querySelectorAll(s)];

function setStatus(el, msg, ok = false) {
  el.classList.remove("error", "ok");
  el.textContent = msg;
  el.classList.add(ok ? "ok" : "error");
}

function soles(n) {
  return "S/ " + Number(n).toLocaleString("es-PE", {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// Tabs
qsa(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    qsa(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const tab = btn.dataset.tab;
    qsa(".tab-panel").forEach(p => p.classList.remove("active"));
    qs(`#tab-${tab}`).classList.add("active");
  });
});

// Estado global
let tariffs = []; // {tipo, distrito, subzona, m2}
let licenseSession = null; // {email, licenseId, expiresAt, active}

// Cargar tarifario al inicio
document.addEventListener("DOMContentLoaded", async () => {
  await loadTariffs();
  setupCascadingSelects();
});

async function loadTariffs() {
  try {
    const res = await fetch(CONFIG.TARIFF_URL, { method: "GET" });
    if (!res.ok) throw new Error("No se pudo obtener tarifario");
    const data = await res.json();
    // Se espera data: [{tipo:"Departamento|Casa|Terreno", distrito:"...", subzona:"...", valorM2: number}]
    tariffs = data || [];
  } catch (e) {
    console.error(e);
    // Dejar el formulario usable pero mostrando aviso
  }
}

// Poblar distritos y subzonas dinámicamente según tarifario
function setupCascadingSelects() {
  const selects = [
    { d: "depto-distrito", s: "depto-subzona" },
    { d: "casa-distrito", s: "casa-subzona" },
    { d: "terreno-distrito", s: "terreno-subzona" }
  ];
  selects.forEach(({ d, s }) => {
    const dSel = qs(`#${d}`);
    const sSel = qs(`#${s}`);
    const distritos = [...new Set(tariffs.map(t => t.distrito))].sort();
    dSel.innerHTML = `<option value="">Seleccione</option>` + distritos.map(x => `<option>${x}</option>`).join("");
    dSel.addEventListener("change", () => {
      const subzonas = [...new Set(tariffs.filter(t => t.distrito === dSel.value).map(t => t.subzona))].sort();
      sSel.innerHTML = `<option value="">Seleccione</option>` + subzonas.map(x => `<option>${x}</option>`).join("");
    });
  });
}

// ====== LICENCIA: Validación ======
qs("#license-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = qs("#email").value.trim();
  const licenseId = qs("#licenseId").value.trim();
  const status = qs("#license-status");
  status.textContent = "Validando licencia...";
  status.classList.remove("error","ok");

  try {
    const url = `${CONFIG.VALIDATE_LICENSE_URL}&email=${encodeURIComponent(email)}&license=${encodeURIComponent(licenseId)}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error("Error de validación");
    const data = await res.json();
    if (data.valid) {
      setStatus(status, "Bienvenido a Tasador Inmobiliario Pro. Tu licencia está activa.", true);
      licenseSession = { email, licenseId, expiresAt: data.expiresAt, active: true };
      qs("#app-section").classList.remove("hidden");
      qs("#welcome").textContent = `Bienvenido. Licencia válida hasta ${new Date(data.expiresAt).toLocaleDateString("es-PE")}.`;
    } else {
      setStatus(status, "Licencia inválida o vencida. Contacta con soporte para renovar tu acceso.", false);
      licenseSession = null;
      qs("#app-section").classList.add("hidden");
    }
  } catch (err) {
    console.error(err);
    setStatus(status, "No fue posible validar la licencia en este momento.", false);
  }
});

// ====== COMPRA: emisión semi-automática ======
qs("#purchase-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    buyerName: qs("#buyerName").value.trim(),
    buyerEmail: qs("#buyerEmail").value.trim(),
    buyerDocType: qs("#buyerDocType").value,
    buyerDocId: qs("#buyerDocId").value.trim(),
    payMethod: qs("#payMethod").value,
    amount: Number(qs("#amount").value),
    voucherUrl: qs("#voucherUrl").value.trim(),
    notes: qs("#notes").value.trim(),
  };
  const st = qs("#purchase-status");
  st.textContent = "Registrando pago y generando licencia...";
  st.classList.remove("error","ok");
  try {
    const res = await fetch(CONFIG.ISSUE_LICENSE_URL, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Fallo de emisión");
    const data = await res.json();
    if (data.issued) {
      setStatus(st, `Licencia generada y enviada a ${payload.buyerEmail}. ID: ${data.licenseId}`, true);
    } else {
      setStatus(st, data.message || "No se pudo emitir la licencia.", false);
    }
  } catch (err) {
    console.error(err);
    setStatus(st, "No fue posible procesar la compra ahora.", false);
  }
});

// ====== CÁLCULOS ======
function getTariff(tipo, distrito, subzona) {
  const match = tariffs.find(t => t.tipo === tipo && t.distrito === distrito && t.subzona === subzona);
  return match ? Number(match.valorM2) : null;
}

// Ajustes:
// - Antigüedad: descuento lineal: 0.5% por año hasta 30 años (top 15%)
// - Condición: Nuevo +5%, Bueno +0%, Regular -5%, Para remodelar -12%
// - Ascensor: +3% si tiene, -4% si no y piso >=4
// - Piso: -0.7% por piso a partir del 5° si sin ascensor, +0.5% si con ascensor en pisos 7-12 (tope +/-5%)
// - Dormitorios: +2% por cada dorm > 2 hasta +6%
// Notas: Ajustes acumulativos, límite ±25%.
function computeAdjustmentsDepartamento({antig, condicion, ascensor, piso, dorms}) {
  let adj = 1;

  // Antigüedad
  const antiDisc = Math.min(antig * 0.005, 0.15);
  adj *= (1 - antiDisc);

  // Condición
  const condMap = { "Nuevo": 1.05, "Bueno": 1.00, "Regular": 0.95, "Para remodelar": 0.88 };
  adj *= (condMap[condicion] || 1.0);

  // Ascensor
  if (ascensor === "si") {
    // Piso con ascensor puede tener leve plus si pisos altos
    if (piso >= 7 && piso <= 12) adj *= 1.005; // +0.5%
  } else {
    // Sin ascensor
    if (piso >= 4) adj *= 0.96; // -4%
    if (piso >= 5) {
      const extra = Math.min((piso - 4) * 0.007, 0.05); // -0.7% desde 5°, cap 5%
      adj *= (1 - extra);
    }
  }

  // Dormitorios
  if (dorms > 2) {
    const plus = Math.min((dorms - 2) * 0.02, 0.06);
    adj *= (1 + plus);
  }

  // Cap global
  adj = Math.max(0.75, Math.min(adj, 1.25));
  return adj;
}

function computeAdjustmentsCasa({antig, condicion, dorms}) {
  let adj = 1;
  const antiDisc = Math.min(antig * 0.005, 0.18);
  adj *= (1 - antiDisc);
  const condMap = { "Nuevo": 1.06, "Bueno": 1.00, "Regular": 0.94, "Para remodelar": 0.86 };
  adj *= (condMap[condicion] || 1.0);
  if (dorms > 3) {
    const plus = Math.min((dorms - 3) * 0.015, 0.06);
    adj *= (1 + plus);
  }
  adj = Math.max(0.72, Math.min(adj, 1.25));
  return adj;
}

function computeAdjustmentsTerreno({antig}) {
  // Terreno: ligera penalización por "antigüedad del título" como proxy (-0.2% por año, máx 5%)
  const disc = Math.min(antig * 0.002, 0.05);
  return 1 - disc;
}

function computeValores({valorM2, areaTotal, ajuste}) {
  const base = valorM2 * areaTotal * ajuste;
  const min = base * 0.90;
  const max = base * 1.10;
  return { min, medio: base, max };
}

function renderResult(el, valores) {
  el.innerHTML = `
    <div class="grid">
      <div class="pill">
        <h4>Mínimo</h4>
        <div>${soles(valores.min)}</div>
      </div>
      <div class="pill">
        <h4>Medio</h4>
        <div>${soles(valores.medio)}</div>
      </div>
      <div class="pill">
        <h4>Máximo</h4>
        <div>${soles(valores.max)}</div>
      </div>
    </div>
  `;
}

// Handlers: Departamento
qs("#form-depto").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!licenseSession?.active) {
    alert("Debes validar una licencia activa.");
    return;
  }
  const distrito = qs("#depto-distrito").value;
  const subzona = qs("#depto-subzona").value;
  const areaTechada = Number(qs("#depto-area-techada").value);
  const areaLibre = Number(qs("#depto-area-libre").value || 0);
  const dorms = Number(qs("#depto-dorms").value);
  const piso = Number(qs("#depto-piso").value);
  const ascensor = qs("#depto-ascensor").value;
  const condicion = qs("#depto-condicion").value;
  const antig = Number(qs("#depto-antig").value);

  const v = getTariff("Departamento", distrito, subzona);
  if (!v) {
    qs("#depto-result").textContent = "No hay valor por m² para la combinación seleccionada.";
    return;
  }
  const areaTotal = areaTechada + Math.max(areaLibre * 0.3, 0); // pondera libre al 30%
  const ajuste = computeAdjustmentsDepartamento({antig, condicion, ascensor, piso, dorms});
  const valores = computeValores({valorM2: v, areaTotal, ajuste});
  renderResult(qs("#depto-result"), valores);
});

// Handlers: Casa
qs("#form-casa").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!licenseSession?.active) { alert("Debes validar una licencia activa."); return; }
  const distrito = qs("#casa-distrito").value;
  const subzona = qs("#casa-subzona").value;
  const areaTechada = Number(qs("#casa-area-techada").value);
  const areaLibre = Number(qs("#casa-area-libre").value || 0);
  const dorms = Number(qs("#casa-dorms").value);
  const condicion = qs("#casa-condicion").value;
  const antig = Number(qs("#casa-antig").value);

  const v = getTariff("Casa", distrito, subzona);
  if (!v) { qs("#casa-result").textContent = "No hay valor por m² para la combinación seleccionada."; return; }
  const areaTotal = areaTechada + Math.max(areaLibre * 0.25, 0); // pondera libre al 25%
  const ajuste = computeAdjustmentsCasa({antig, condicion, dorms});
  const valores = computeValores({valorM2: v, areaTotal, ajuste});
  renderResult(qs("#casa-result"), valores);
});

// Handlers: Terreno
qs("#form-terreno").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!licenseSession?.active) { alert("Debes validar una licencia activa."); return; }
  const distrito = qs("#terreno-distrito").value;
  const subzona = qs("#terreno-subzona").value;
  const area = Number(qs("#terreno-area").value);
  const antig = Number(qs("#terreno-antig").value);

  const v = getTariff("Terreno", distrito, subzona);
  if (!v) { qs("#terreno-result").textContent = "No hay valor por m² para la combinación seleccionada."; return; }
  const ajuste = computeAdjustmentsTerreno({antig});
  const valores = computeValores({valorM2: v, areaTotal: area, ajuste});
  renderResult(qs("#terreno-result"), valores);
});
