// ========== CONFIGURACIÓN BACKEND ==========
// Reemplaza SOLO esta línea con tu URL /exec exacta (sin action)
const BASE_URL = "https://script.google.com/macros/s/AKfycbxzJrzoMS2CblbRf6vDErbjpNsdDfojMdZ376WsRvgWDR760ZSHTlrWDzZ3gCPb2nWf_g/exec";
// No edites lo de abajo:
const TARIFF_URL = `${BASE_URL}?action=tariffs`;
const VALIDATE_LICENSE_URL = `${BASE_URL}?action=validate`;
const ISSUE_LICENSE_URL = `${BASE_URL}?action=issue`;

// ========== ESTADO EN MEMORIA ==========
let TARIFAS = []; // [{ distrito, subzona, valorM2 }, ...]

// ========== FUNCIONES API ==========
async function cargarTarifas(){
  const res = await fetch(TARIFF_URL);
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function validarLicencia(email, licencia){
  const url = `${VALIDATE_LICENSE_URL}&email=${encodeURIComponent(email)}&licencia=${encodeURIComponent(licencia)}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function emitirLicencia(email, notas=""){
  const url = `${ISSUE_LICENSE_URL}&email=${encodeURIComponent(email)}&notas=${encodeURIComponent(notas)}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ========== UI HELPERS ==========
function byId(id){ return document.getElementById(id); }
function setMsg(el, text, ok=false){
  el.textContent = text || "";
  el.classList.remove("ok","err");
  if (!text) return;
  el.classList.add(ok ? "ok" : "err");
}

function unique(arr){ return Array.from(new Set(arr)); }

// ========== RELLENO DE SELECTS ==========
function poblarDistritos(){
  const selDistrito = byId("sel-distrito");
  selDistrito.innerHTML = "";
  const distritos = unique(TARIFAS.map(t => t.distrito));
  selDistrito.insertAdjacentHTML("beforeend", `<option value="">— Selecciona —</option>`);
  distritos.forEach(d => {
    selDistrito.insertAdjacentHTML("beforeend", `<option value="${d}">${d}</option>`);
  });
}

function poblarSubzonas(distrito){
  const selSubzona = byId("sel-subzona");
  selSubzona.innerHTML = "";
  const subzonas = unique(TARIFAS.filter(t => t.distrito === distrito).map(t => t.subzona));
  selSubzona.insertAdjacentHTML("beforeend", `<option value="">— Selecciona —</option>`);
  subzonas.forEach(s => {
    selSubzona.insertAdjacentHTML("beforeend", `<option value="${s}">${s}</option>`);
  });
  selSubzona.disabled = subzonas.length === 0;
}

function buscarValorM2(distrito, subzona){
  const item = TARIFAS.find(t => t.distrito === distrito && t.subzona === subzona);
  return item ? Number(item.valorM2) : NaN;
}

// ========== EVENTOS ==========
window.addEventListener("DOMContentLoaded", async () => {
  // Wiring botones
  byId("btn-validar").addEventListener("click", onValidar);
  byId("btn-calcular").addEventListener("click", onCalcular);
  byId("btn-emitir").addEventListener("click", onEmitir);

  byId("sel-distrito").addEventListener("change", (e)=>{
    const d = e.target.value;
    poblarSubzonas(d || "");
  });
});

async function onValidar(){
  const email = byId("email").value.trim().toLowerCase();
  const lic = byId("licencia").value.trim();
  const msg = byId("msg-validacion");
  setMsg(msg, "Validando...");

  try {
    const r = await validarLicencia(email, lic);
    if (r.ok){
      setMsg(msg, `Licencia válida. Vence: ${r.vence}`, true);
      // Habilitar secciones
      byId("seccion-tarifas").classList.remove("hidden");
      byId("seccion-emitir").classList.remove("hidden");

      // Cargar tarifas 1 sola vez
      if (TARIFAS.length === 0){
        TARIFAS = await cargarTarifas();
        poblarDistritos();
      }
    } else {
      setMsg(msg, `Error: ${r.error}`);
    }
  } catch(err){
    setMsg(msg, `Fallo de red: ${err.message}`);
  }
}

function parseNum(v){ return Number(String(v || "").replace(",", ".").trim()); }

function onCalcular(){
  const distrito = byId("sel-distrito").value;
  const subzona = byId("sel-subzona").value;
  const aTechada = parseNum(byId("depto-area-techada").value);
  const aLibre = parseNum(byId("depto-area-libre").value);
  const msg = byId("msg-calculo");
  setMsg(msg, "");

  if (!distrito || !subzona) return setMsg(msg, "Selecciona distrito y subzona");
  if (isNaN(aTechada) || aTechada <= 0) return setMsg(msg, "Ingresa área techada válida");
  if (isNaN(aLibre) || aLibre < 0) return setMsg(msg, "Ingresa área libre válida");

  const vM2 = buscarValorM2(distrito, subzona);
  if (isNaN(vM2)) return setMsg(msg, "No se encontró valor m² para esa subzona");

  const areaTotal = aTechada + aLibre;
  const valor = areaTotal * vM2;
  setMsg(msg, `Valor estimado: ${areaTotal.toFixed(2)} m² × ${vM2.toLocaleString()} = ${valor.toLocaleString()}`, true);
}

async function onEmitir(){
  const email = byId("email-compra").value.trim().toLowerCase();
  const notas = byId("notas").value.trim();
  const msg = byId("msg-emitir");
  setMsg(msg, "Emitiendo...");

  if (!email) return setMsg(msg, "Ingresa el email");

  try {
    const r = await emitirLicencia(email, notas);
    if (r.ok){
      setMsg(msg, `Licencia: ${r.licencia} (vence ${r.vence})`, true);
    } else {
      setMsg(msg, `Error: ${r.error}`);
    }
  } catch(err){
    setMsg(msg, `Fallo de red: ${err.message}`);
  }
}

