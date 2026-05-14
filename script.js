const SHEET_ID = "1MZhtTMtktJ_XoiEMVydK8Y5XzBSdMDo7G_yYGLZgM-c";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
const GIFT = 5;

let catalogo = [];
let resultados = [];
let orcamento = [];
let filtroAtivo = "todos";

// ── Fórmulas ────────────────────────────────────────────────
function moTela(vp) {
  if (vp < 100) return 190;
  if (vp < 320) return 180;
  if (vp < 600) return 280;
  return 450;
}

function moBateria(vp) {
  if (vp < 100) return 80;
  if (vp < 150) return 120;
  if (vp < 250) return 150;
  return 300;
}

function moDock(vp) {
  if (vp < 80) return 80;
  if (vp < 110) return 90;
  if (vp < 190) return 120;
  return 360;
}

function moTampa(vp) {
  if (vp < 100) return 100;
  if (vp < 200) return 180;
  if (vp < 320) return 280;
  if (vp < 600) return 380;
  return 550;
}

function calcTela(vp) {
  const mo = moTela(vp);
  const erro = vp * 0.18;
  const sub = vp + mo + erro + GIFT;
  const total = sub;
  return { mo, erro, sub, total, taxaCartao: sub * 0.1, gift: GIFT };
}

function calcBateria(vp) {
  const mo = moBateria(vp);
  const erro = vp * 0.18;
  const sub = vp + mo + erro;
  const total = sub;
  return { mo, erro, sub, total, taxaCartao: sub * 0.1, gift: 0 };
}

function calcDock(vp) {
  const mo = moDock(vp);
  const erro = vp * 0.18;
  const total = vp + mo + erro;
  return { mo, erro, total, taxaCartao: total * 0.1, gift: 0 };
}

function calcTampa(vp, adicional = 0) {
  const mo = moTampa(vp);
  const totalParcial = vp + mo + adicional;
  const total = totalParcial * 1.15;
  const taxaCartao = totalParcial * 0.1;
  const taxaErro = totalParcial * 0.05;
  return { mo, totalParcial, total, taxaCartao, taxaErro, gift: 0 };
}

function calcular(item) {
  if (item.categoria === "tela") return calcTela(item.valor);
  if (item.categoria === "bateria") return calcBateria(item.valor);
  if (item.categoria === "dock") return calcDock(item.valor);
  if (item.categoria === "tampa") return calcTampa(item.valor);
}

// ── Formatação ───────────────────────────────────────────────
function fmt(v) {
  const arredondado = Math.round(v / 10) * 10;
  return (
    "R$ " +
    arredondado
      .toFixed(2)
      .replace(".", ",")
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
}
// ── Carregar CSV ─────────────────────────────────────────────
fetch(CSV_URL)
  .then((r) => {
    if (!r.ok) throw new Error("Erro ao carregar");
    return r.text();
  })
  .then((csv) => {
    catalogo = csv
      .trim()
      .split("\n")
      .slice(1)
      .map((linha) => {
        const cols = linha.split(",");
        return {
          modelo: cols[0]?.trim(),
          valor: parseFloat(cols[1]),
          categoria: cols[2]?.trim(),
        };
      })
      .filter((p) => p.modelo && !isNaN(p.valor));
    filtrar();
  })
  .catch(() => {
    document.getElementById("resultados").innerHTML =
      '<div class="erro">Erro ao carregar o catálogo. Verifique se a planilha está pública.</div>';
  });

// ── Filtrar ──────────────────────────────────────────────────
function filtrar() {
  const q = document.getElementById("busca").value.toLowerCase().trim();
  const el = document.getElementById("resultados");

  if (!q) {
    el.innerHTML = '<div class="vazio">Digite o modelo para buscar.</div>';
    return;
  }

  resultados = catalogo.filter((p) => {
    const matchQ = p.modelo.toLowerCase().includes(q);
    const matchCat = filtroAtivo === "todos" || p.categoria === filtroAtivo;
    return matchQ && matchCat;
  });

  if (resultados.length === 0) {
    el.innerHTML = '<div class="vazio">Nenhum modelo encontrado.</div>';
    return;
  }

  el.innerHTML = resultados
    .map((p, i) => {
      const c = calcular(p);
      const jaAdd = orcamento.find(
        (o) => o.modelo === p.modelo && o.categoria === p.categoria,
      );
      return `<div class="resultado-item">
        <span class="item-nome">${p.modelo}</span>
        <span class="item-cat cat-${p.categoria}">${p.categoria}</span>
        <span class="item-preco">${fmt(c.total)}</span>
        ${
          jaAdd
            ? '<span class="ja-add">adicionado</span>'
            : `<button class="btn-add" onclick="adicionar(${i})">+ Add</button>`
        }
      </div>`;
    })
    .join("");
}

function setFiltro(f, el) {
  filtroAtivo = f;
  document
    .querySelectorAll(".chip")
    .forEach((c) => c.classList.remove("active"));
  el.classList.add("active");
  filtrar();
}

// ── Orçamento ────────────────────────────────────────────────
function adicionar(i) {
  const p = resultados[i];
  if (
    orcamento.find((o) => o.modelo === p.modelo && o.categoria === p.categoria)
  )
    return;
  orcamento.push({ ...p });
  renderOrcamento();
  filtrar();
}

function remover(i) {
  orcamento.splice(i, 1);
  renderOrcamento();
  filtrar();
}

function limpar() {
  orcamento = [];
  renderOrcamento();
  filtrar();
}

function renderOrcamento() {
  const body = document.getElementById("orc-body");
  if (orcamento.length === 0) {
    body.innerHTML =
      '<div class="orc-vazio">Adicione peças acima para montar o orçamento.</div>';
    return;
  }

  const total = orcamento.reduce((s, p) => s + calcular(p).total, 0);
  const descontoTotal = orcamento.reduce((s, p) => {
    const c = calcular(p);
    return s + c.taxaCartao + (c.taxaErro || c.erro || 0) + (c.gift || 0);
  }, 0);

  body.innerHTML =
    orcamento
      .map((p, i) => {
        const ehIphoneTampa =
          p.categoria === "tampa" && p.modelo.toLowerCase().includes("iphone");

        if (ehIphoneTampa) {
          const cNormal = calcTampa(p.valor, 0);
          const cPrimeira = calcTampa(p.valor, 100);
          const maxDesc = cNormal.taxaCartao + cNormal.taxaErro;
          return `<div class="orc-item">
        <div class="orc-item-top">
          <div>
            <span class="orc-item-nome">${p.modelo}</span>
            <span class="item-cat cat-tampa" style="margin-left:8px">tampa</span>
          </div>
          <button class="btn-rm" onclick="remover(${i})">×</button>
        </div>
        <div class="orc-item-det" style="margin-top:6px">
          Já trocada: <strong>${fmt(cNormal.total)}</strong>
          &nbsp;·&nbsp;
          1ª troca: <strong>${fmt(cPrimeira.total)}</strong>
        </div>
        <div class="orc-item-desc">Desconto máx: ${fmt(maxDesc)}</div>
      </div>`;
        }

        const c = calcular(p);
        const maxDesc =
          c.taxaCartao + (c.taxaErro || c.erro || 0) + (c.gift || 0);
        return `<div class="orc-item">
      <div class="orc-item-top">
        <div>
          <span class="orc-item-nome">${p.modelo}</span>
          <span class="item-cat cat-${p.categoria}" style="margin-left:8px">${p.categoria}</span>
        </div>
        <div style="display:flex;align-items:center">
          <span class="orc-item-final">${fmt(c.total)}</span>
          <button class="btn-rm" onclick="remover(${i})">×</button>
        </div>
      </div>
      <div class="orc-item-det">Peça: ${fmt(p.valor)} · MO: ${fmt(c.mo)}</div>
      <div class="orc-item-desc">Desconto máx: ${fmt(maxDesc)}</div>
    </div>`;
      })
      .join("") +
    `<div class="orc-total"><span>Total</span><span>${fmt(total)}</span></div>
   <div style="padding:8px 14px;font-size:13px;color:#c0392b;background:#fdf0f0;border-top:1px solid #f0f0f0;">
     Desconto máx total: ${fmt(descontoTotal)}
   </div>`;
}

function copiarOrcamento() {
  const linhas = orcamento.map((p) => {
    if (p.categoria === "tampa" && p.modelo.toLowerCase().includes("iphone")) {
      const cNormal = calcTampa(p.valor, 0);
      const cPrimeira = calcTampa(p.valor, 100);
      return `*${p.modelo}* (Tampa)\n  Já trocada: ${fmt(cNormal.total)}\n  1ª troca: ${fmt(cPrimeira.total)}`;
    }
    const c = calcular(p);
    return `*${p.modelo}* (${p.categoria}): ${fmt(c.total)}`;
  });

  const total = orcamento.reduce((s, p) => s + calcular(p).total, 0);
  const descontoTotal = orcamento.reduce((s, p) => {
    const c = calcular(p);
    return s + c.taxaCartao + (c.taxaErro || c.erro || 0) + (c.gift || 0);
  }, 0);

  const texto =
    linhas.join("\n") +
    `\n\nTotal: ${fmt(total)}\nDesconto máx: ${fmt(descontoTotal)}`;

  navigator.clipboard.writeText(texto).then(() => {
    const btn = document.getElementById("btn-copiar");
    btn.textContent = "✓ Copiado!";
    setTimeout(() => (btn.textContent = "Copiar orçamento"), 2000);
  });
}
