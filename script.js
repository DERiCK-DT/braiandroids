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
  if (vp < 50) return 100;
  if (vp < 80) return 120;
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

  // === ATUALIZAÇÃO DA TRAVA DO BOTÃO DENTRO DE renderOrcamento ===
  const telas = orcamento.filter(
    (p) =>
      p.categoria === "tela" &&
      p.modelo.toLowerCase().match(/lcd|oled|amoled|softoled/i),
  );

  // Validação inteligente para saber se as telas são do mesmo modelo
  let temVariacaoTela = false;
  if (telas.length > 1) {
    const termosTecnicos = /lcd|oled|amoled|softoled/i;
    const extrairModeloPuro = (nome) => {
      return nome
        .toLowerCase()
        .replace(
          /^(moto|samsung|iphone|xiaomi|asus|lg|lenovo|realme|poco|galaxy|infinix|tecno spark|tecno|motorola|redmi|redmi note|note)\s+/i,
          "",
        )
        .split(termosTecnicos)[0]
        .trim();
    };
    const primeiroModeloPuro = extrairModeloPuro(telas[0].modelo);
    temVariacaoTela = telas.every(
      (t) => extrairModeloPuro(t.modelo) === primeiroModeloPuro,
    );
  }

  // O botão é liberado se: for apenas 1 item OU se houver variação real da mesma tela (mesmo com bateria junto)
  const btnAvista = document.getElementById("btn-avista");
  if (btnAvista) {
    const liberarBtn = orcamento.length === 1 || temVariacaoTela;
    btnAvista.disabled = !liberarBtn;
    btnAvista.style.opacity = liberarBtn ? "1" : "0.4";
    btnAvista.style.cursor = liberarBtn ? "pointer" : "not-allowed";
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
    `<div class="orc-total"><span>Total Somado</span><span>${fmt(total)}</span></div>
   <div style="padding:8px 14px;font-size:13px;color:#ba2527;background:#f8fafc;border-top:1px solid #e2e8f0;font-weight:500;">
     Desconto máx total: ${fmt(descontoTotal)}
   </div>`;
}

function copiarOrcamento() {
  if (orcamento.length === 0) return;

  // Separa o que é tela com variação (LCD, OLED, etc) do que são os outros serviços fixos (bateria, dock...)
  const telas = orcamento.filter(
    (p) =>
      p.categoria === "tela" &&
      p.modelo.toLowerCase().match(/lcd|oled|amoled|softoled/i),
  );
  const outrosItens = orcamento.filter((p) => !telas.includes(p));

  // Nova validação: Só considera variação se as telas pertencerem EXATAMENTE ao mesmo modelo (ignorando a marca e a tecnologia)
  let temVariacaoTela = false;
  if (telas.length > 1) {
    const termosTecnicos = /lcd|oled|amoled|softoled/i;
    // Função auxiliar para remover a marca comum e o termo técnico, restando o modelo real
    const extrairModeloPuro = (nome) => {
      return nome
        .toLowerCase()
        .replace(
          /^(moto|samsung|iphone|xiaomi|asus|lg|lenovo|realme|poco|galaxy|infinix|tecno spark|tecno|motorola|redmi|redmi note|note)\s+/i,
          "",
        ) // Remove a marca no início
        .split(termosTecnicos)[0] // Remove o termo técnico
        .trim();
    };

    const primeiroModeloPuro = extrairModeloPuro(telas[0].modelo);
    // Verifica se todas as telas no carrinho são variações desse mesmo modelo puro
    temVariacaoTela = telas.every(
      (t) => extrairModeloPuro(t.modelo) === primeiroModeloPuro,
    );
  }

  // Calcula o valor total e desconto fixo dos outros itens
  const totalOutros = outrosItens.reduce((s, p) => s + calcular(p).total, 0);
  const descOutros = outrosItens.reduce((s, p) => {
    const c = calcular(p);
    return s + c.taxaCartao + (c.taxaErro || c.erro || 0) + (c.gift || 0);
  }, 0);

  let texto = "";

  // === CENÁRIO A: SE HOUVER VARIAÇÃO DE TELA DO MESMO MODELO ===
  if (temVariacaoTela) {
    // Remove apenas o termo técnico para o título principal (mantendo a Marca + Modelo correto, ex: "Moto G7 Play")
    const nomeBase = telas[0].modelo
      .split(/lcd|oled|amoled|softoled/i)[0]
      .trim();
    texto = `📱 *Orçamento — ${nomeBase}*\n— — — — — — — — — — — — — —\n\n`;

    // Lista os serviços adicionais primeiro, se houver (ex: bateria)
    outrosItens.forEach((p) => {
      const c = calcular(p);
      texto += `🛠️ *${p.modelo} (${p.categoria}):* ${fmt(c.total)}\n`;
    });
    if (outrosItens.length > 0) texto += `\n`;

    // Lista as opções de tecnologia de tela disponíveis
    telas.forEach((p) => {
      const c = calcular(p);
      const termoTecnico =
        p.modelo.match(/lcd|oled|amoled|softoled/i)?.[0]?.toUpperCase() ||
        "Padrão";
      texto += `🔹 *Opção Tela ${termoTecnico}:* ${fmt(c.total)}\n`;
    });

    texto += `\n— — — — — — — — — — — — — —\n\n`;

    // Gera os totais finais individuais para cada cenário (Outros Itens + Tela X)
    telas.forEach((p) => {
      const c = calcular(p);
      const termoTecnico =
        p.modelo.match(/lcd|oled|amoled|softoled/i)?.[0]?.toUpperCase() ||
        "Padrão";

      const subtotalCenario = totalOutros + c.total;
      const descontoCenario =
        descOutros + (c.taxaCartao + (c.erro || 0) + c.gift);

      texto += `👉 *Total c/ Tela ${termoTecnico} à vista:* *${fmt(subtotalCenario - descontoCenario)}*\n`;
    });
    texto = texto.trim();
  } else {
    // === CENÁRIO B: CÓDIGO PADRÃO ORIGINAL (ITENS DIFERENTES OU MOTO G7 PLAY + MOTO G7 POWER JUNTOS) ===
    const total = orcamento.reduce((s, p) => s + calcular(p).total, 0);
    const descontoTotal = orcamento.reduce((s, p) => {
      const c = calcular(p);
      return s + c.taxaCartao + (c.taxaErro || c.erro || 0) + (c.gift || 0);
    }, 0);

    const p = orcamento[0];
    const c = calcular(p);

    if (orcamento.length > 1) {
      texto = `📱 *Orçamento Completo*\n— — — — — — — — — — — — — —\n\n`;
      orcamento.forEach((item) => {
        if (
          item.categoria === "tampa" &&
          item.modelo.toLowerCase().includes("iphone")
        ) {
          const cNormal = calcTampa(item.valor, 0);
          const cPrimeira = calcTampa(item.valor, 100);
          texto += `🛠️ *${item.modelo} (Tampa)*\n  • Já trocada: ${fmt(cNormal.total)}\n  • 1ª troca: ${fmt(cPrimeira.total)}\n\n`;
        } else {
          const cI = calcular(item);
          texto += `🛠️ *${item.modelo} (${item.categoria}):* ${fmt(cI.total)}\n\n`;
        }
      });
      texto = texto.trim() + `\n\n— — — — — — — — — — — — — —\n\n`;
      texto += `🔹 *Subtotal:* ${fmt(total)}\n`;
      texto += `💸 *Desconto à vista:* ${fmt(descontoTotal)}\n\n`;
      texto += `👉 *Total à vista:* *${fmt(total - descontoTotal)}*`;
    } else {
      // Um só aparelho/serviço no carrinho
      if (
        p.categoria === "tampa" &&
        p.modelo.toLowerCase().includes("iphone")
      ) {
        const cNormal = calcTampa(p.valor, 0);
        const cPrimeira = calcTampa(p.valor, 100);
        texto = `📱 *Orçamento — ${p.modelo} (Tampa)*\n— — — — — — — — — — — — — —\n\n🔹 *Já trocada:* ${fmt(cNormal.total)}\n🔹 *1ª troca:* ${fmt(cPrimeira.total)}\n\n— — — — — — — — — — — — — —\n\n💸 *Desconto à vista:* ${fmt(descontoTotal)}\n\n👉 *Total já trocada à vista:* *${fmt(cNormal.total - descontoTotal)}*\n👉 *Total 1ª troca à vista:* *${fmt(cPrimeira.total - descontoTotal)}*`;
      } else {
        texto = `📱 *Orçamento — ${p.modelo} (${p.categoria})*\n— — — — — — — — — — — — — —\n\n🔹 *Valor padrão:* ${fmt(c.total)}\n💸 *Desconto à vista:* ${fmt(descontoTotal)}\n\n👉 *Total à vista:* *${fmt(c.total - descontoTotal)}*`;
      }
    }
  }

  // Copiar para a área de transferência
  navigator.clipboard.writeText(texto).then(() => {
    const btn = document.getElementById("btn-copiar");
    if (btn) {
      btn.textContent = "✓ Copiado!";
      setTimeout(() => (btn.textContent = "Copiar c/ desc máximo"), 2000);
    }
  });
}

function copiarAvista() {
  if (orcamento.length === 0) return;

  // Separa o que é tela com variação (LCD, OLED, etc) do que são os outros serviços fixos (bateria, dock...)
  const telas = orcamento.filter(
    (p) =>
      p.categoria === "tela" &&
      p.modelo.toLowerCase().match(/lcd|oled|amoled|softoled/i),
  );
  const outrosItens = orcamento.filter((p) => !telas.includes(p));

  // Mesma validação inteligente: Só considera variação se as telas pertencerem ao MESMO modelo puro
  let temVariacaoTela = false;
  if (telas.length > 1) {
    const termosTecnicos = /lcd|oled|amoled|softoled/i;
    const extrairModeloPuro = (nome) => {
      return nome
        .toLowerCase()
        .replace(
          /^(moto|samsung|iphone|xiaomi|asus|lg|lenovo|realme|poco|galaxy|infinix|tecno spark|tecno|motorola|redmi|redmi note|note)\s+/i,
          "",
        ) // Remove a marca
        .split(termosTecnicos)[0] // Remove o termo técnico
        .trim();
    };

    const primeiroModeloPuro = extrairModeloPuro(telas[0].modelo);
    temVariacaoTela = telas.every(
      (t) => extrairModeloPuro(t.modelo) === primeiroModeloPuro,
    );
  }

  const descontoFixo = 20;
  let texto = "";

  // === CENÁRIO A: SE HOUVER VARIAÇÃO DE TELA DO MESMO MODELO ===
  if (temVariacaoTela) {
    const nomeBase = telas[0].modelo
      .split(/lcd|oled|amoled|softoled/i)[0]
      .trim();
    texto = `📱 *Orçamento — ${nomeBase}*\n— — — — — — — — — — — — — —\n\n`;

    // Mostra o valor padrão já reduzido dos itens adicionais fixos (se houver)
    outrosItens.forEach((p) => {
      const c = calcular(p);
      texto += `🛠️ *${p.modelo} (${p.categoria}) à vista:* ${fmt(c.total - descontoFixo)}\n`;
    });
    if (outrosItens.length > 0) texto += `\n`;

    // Lista as opções de tela (valor cheio para manter o padrão estético do botão anterior)
    telas.forEach((p) => {
      const c = calcular(p);
      const termoTecnico =
        p.modelo.match(/lcd|oled|amoled|softoled/i)?.[0]?.toUpperCase() ||
        "Padrão";
      texto += `🔹 *Opção Tela ${termoTecnico}:* ${fmt(c.total)}\n`;
    });

    texto += `\n— — — — — — — — — — — — — —\n\n`;
    texto += `💸 *Desconto à vista:* ${fmt(descontoFixo)}\n\n`;

    // Calcula o total dos outros itens já com o desconto aplicado
    const totalOutrosRegredido = outrosItens.reduce(
      (s, p) => s + (calcular(p).total - descontoFixo),
      0,
    );

    // Gera os totais à vista de cada cenário
    telas.forEach((p) => {
      const c = calcular(p);
      const termoTecnico =
        p.modelo.match(/lcd|oled|amoled|softoled/i)?.[0]?.toUpperCase() ||
        "Padrão";
      texto += `👉 *Total c/ Tela ${termoTecnico} à vista:* *${fmt(totalOutrosRegredido + (c.total - descontoFixo))}*\n`;
    });
    texto = texto.trim();
  } else {
    // === CENÁRIO B: PADRÃO ORIGINAL PARA 1 ITEM NO CARRINHO ===
    const p = orcamento[0];
    const cPadrao = calcular(p);
    const cNormal = calcTampa(p.valor, 0);
    const cPrimeira = calcTampa(p.valor, 100);

    if (p.categoria === "tampa" && p.modelo.toLowerCase().includes("iphone")) {
      texto = `📱 *Orçamento — ${p.modelo} (Tampa)*\n`;
      texto += `— — — — — — — — — — — — — —\n\n`;
      texto += `🔹 *Já trocada:* ${fmt(cNormal.total)}\n`;
      texto += `🔹 *1ª troca:* ${fmt(cPrimeira.total)}\n\n`;
      texto += `— — — — — — — — — — — — — —\n\n`;
      texto += `💸 *Desconto à vista:* ${fmt(descontoFixo)}\n\n`;
      texto += `👉 *Total já trocada à vista:* *${fmt(cNormal.total - descontoFixo)}*\n`;
      texto += `👉 *Total 1ª troca à vista:* *${fmt(cPrimeira.total - descontoFixo)}*`;
    } else {
      texto = `📱 *Orçamento — ${p.modelo} (${p.categoria})*\n`;
      texto += `— — — — — — — — — — — — — —\n\n`;
      texto += `🔹 *Valor padrão:* ${fmt(cPadrao.total)}\n`;
      texto += `💸 *Desconto à vista:* ${fmt(descontoFixo)}\n\n`;
      texto += `👉 *Total à vista:* *${fmt(cPadrao.total - descontoFixo)}*`;
    }
  }

  // Copiar para a área de transferência
  navigator.clipboard.writeText(texto).then(() => {
    const btn = document.getElementById("btn-avista");
    if (btn) {
      btn.textContent = "✓ Copiado!";
      setTimeout(() => (btn.textContent = "Copiar c/ desc à vista"), 2000);
    }
  });
}
