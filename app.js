const API_URL = "https://consultaedu-gestores-api.marcosdalleprane2.workers.dev/";

let dados = [];

const instituicao = document.getElementById("instituicao");
const turma = document.getElementById("turma");
const periodo = document.getElementById("periodo");
const painelFiltros = document.getElementById("painelFiltros");
const campoIngresso = document.getElementById("campoIngresso");
const ingresso = document.getElementById("ingresso");
const curso = document.getElementById("curso");
const disciplina = document.getElementById("disciplina");
const resultado = document.getElementById("resultado");
const statusBox = document.getElementById("status");
const pesquisa = document.getElementById("pesquisa");
const avisos = document.getElementById("avisos");

carregarDados();

async function carregarDados() {
  try {
    const resposta = await fetch(API_URL);
    const json = await resposta.json();

    if (!json.sucesso) {
      statusBox.textContent = json.mensagem || "Sistema indisponível.";
      return;
    }

    dados = prepararDados(json.dados || []);

    montarAvisos(json.avisos || []);
    preencherSelect(instituicao, valoresUnicos(dados, "instituicao"));

    statusBox.textContent =
      `Base carregada com ${dados.length} registros. ` +
      `Última atualização: ${json.atualizadoEm || "-"}`;
  } catch (erro) {
    console.error(erro);
    statusBox.textContent = "Erro ao carregar os dados.";
  }
}

function montarAvisos(lista) {
  avisos.innerHTML = "";

  lista.forEach(aviso => {
    const div = document.createElement("div");
    div.className = "aviso";
    div.innerHTML = `<strong>${aviso.titulo}</strong><br>${aviso.mensagem}`;
    avisos.appendChild(div);
  });
}

function prepararDados(lista) {
  return lista.map(item => ({
    ...item,
    ingresso: String(item.ingresso || "").trim(),
    data: formatarDataExibicao(item.data)
  }));
}

function valoresUnicos(lista, campo) {
  return [...new Set(lista.map(item => item[campo]).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
}

function preencherSelect(select, valores, textoInicial = "Selecione") {
  select.innerHTML = `<option value="">${textoInicial}</option>`;

  valores.forEach(valor => {
    const option = document.createElement("option");
    option.value = valor;
    option.textContent = valor;
    select.appendChild(option);
  });

  select.disabled = valores.length === 0;
}

instituicao.addEventListener("change", () => {
  preencherSelect(
    turma,
    valoresUnicos(
      filtrarDados({ instituicao: instituicao.value }),
      "turma"
    )
  );

  resetSelect(periodo);
  ocultarIngresso();
  resetSelect(curso);
  resetSelect(disciplina);
  limparResultado();
});

turma.addEventListener("change", () => {
  preencherSelect(
    periodo,
    valoresUnicos(
      filtrarDados({
        instituicao: instituicao.value,
        turma: turma.value
      }),
      "periodo"
    )
  );

  ocultarIngresso();
  resetSelect(curso);
  resetSelect(disciplina);
  limparResultado();
});

periodo.addEventListener("change", configurarIngressoECursos);
ingresso.addEventListener("change", atualizarCursos);
curso.addEventListener("change", atualizarDisciplinas);
disciplina.addEventListener("change", renderizarResultado);
pesquisa.addEventListener("input", renderizarResultado);

function configurarIngressoECursos() {
  resetSelect(curso);
  resetSelect(disciplina);
  limparResultado();

  if (!periodo.value) {
    ocultarIngresso();
    return;
  }

  const basePeriodo = filtrarDados({
    instituicao: instituicao.value,
    turma: turma.value,
    periodo: periodo.value
  });

  const meses = ordenarIngressos(valoresUnicos(basePeriodo, "ingresso"));
  const existemPastasSemIngresso = basePeriodo.some(item => !item.ingresso);

  if (meses.length === 0) {
    ocultarIngresso();
    preencherCursos(basePeriodo.filter(item => !item.ingresso));
    return;
  }

  campoIngresso.hidden = false;
  painelFiltros.classList.remove("sem-ingresso");
  ingresso.innerHTML = "";

  const opcaoVazia = document.createElement("option");
  opcaoVazia.value = "";
  opcaoVazia.textContent = existemPastasSemIngresso
    ? "Sem mês selecionado"
    : "Selecione o mês de ingresso";

  ingresso.appendChild(opcaoVazia);

  meses.forEach(mes => {
    const option = document.createElement("option");
    option.value = mes;
    option.textContent = mes;
    ingresso.appendChild(option);
  });

  ingresso.disabled = false;

  if (existemPastasSemIngresso) {
    preencherCursos(basePeriodo.filter(item => !item.ingresso));
  } else {
    resetSelect(curso);
  }
}

function atualizarCursos() {
  resetSelect(disciplina);
  limparResultado();

  const basePeriodo = filtrarDados({
    instituicao: instituicao.value,
    turma: turma.value,
    periodo: periodo.value
  });

  const lista = basePeriodo.filter(item => {
    return normalizarValor(item.ingresso) === normalizarValor(ingresso.value);
  });

  preencherCursos(lista);
}

function preencherCursos(lista) {
  preencherSelect(curso, valoresUnicos(lista, "curso"));
}

function atualizarDisciplinas() {
  const lista = obterDadosDoContextoAtual();

  preencherSelect(
    disciplina,
    valoresUnicos(lista, "disciplina")
  );

  limparResultado();
}

function obterDadosDoContextoAtual() {
  let lista = filtrarDados({
    instituicao: instituicao.value,
    turma: turma.value,
    periodo: periodo.value
  });

  if (!campoIngresso.hidden) {
    lista = lista.filter(item => {
      return normalizarValor(item.ingresso) === normalizarValor(ingresso.value);
    });
  } else {
    lista = lista.filter(item => !item.ingresso);
  }

  if (curso.value) {
    lista = lista.filter(item => item.curso === curso.value);
  }

  if (disciplina.value) {
    lista = lista.filter(item => item.disciplina === disciplina.value);
  }

  return lista;
}

function filtrarDados(filtros) {
  return dados.filter(item => {
    return Object.entries(filtros).every(([campo, valor]) => {
      return !valor || item[campo] === valor;
    });
  });
}

function renderizarResultado() {
  const textoBusca = normalizar(pesquisa.value);
  let lista = obterDadosDoContextoAtual();

  if (textoBusca) {
    lista = lista.filter(item => {
      const texto = normalizar([
        item.instituicao,
        item.turma,
        item.periodo,
        item.ingresso,
        item.curso,
        item.disciplina,
        item.aula,
        item.data,
        item.status
      ].join(" "));

      return texto.includes(textoBusca);
    });
  }

  resultado.innerHTML = "";

  if (!disciplina.value && !textoBusca) {
    statusBox.textContent = "Selecione uma disciplina ou use a busca.";
    return;
  }

  if (lista.length === 0) {
    statusBox.textContent = "Nenhuma atividade encontrada.";
    return;
  }

  statusBox.textContent = `${lista.length} atividade(s) encontrada(s).`;

  lista
    .sort(ordenarPorAula)
    .forEach(item => resultado.appendChild(criarCard(item)));
}

function criarCard(item) {
  const card = document.createElement("article");
  card.className = "card";

  const statusClasse =
    item.status === "Completo" ? "status-completo" : "status-alerta";

  card.innerHTML = `
    <span class="status-tag ${statusClasse}">
      ${item.status || "Verificar"}
    </span>

    <h3>${item.aula || "Aula"}</h3>

    <div class="meta">
      <strong>${item.data || "Data não informada"}</strong><br>
      ${item.disciplina || ""}<br>
      ${item.curso || ""}
      ${item.ingresso ? `<br>Ingresso: ${item.ingresso}` : ""}
    </div>

    <div class="acoes">
      ${
        item.pdfAtividade
          ? `<a class="btn-principal" href="${item.pdfAtividade}" target="_blank" rel="noopener">📄 Baixar atividade</a>`
          : ""
      }

      ${
        item.pdfLista
          ? `<a class="btn-principal" href="${item.pdfLista}" target="_blank" rel="noopener">📋 Baixar lista</a>`
          : ""
      }

      ${
        item.pastaAula
          ? `<a class="btn-secundario" href="${item.pastaAula}" target="_blank" rel="noopener">🔗 Abrir pasta</a>`
          : ""
      }
    </div>
  `;

  return card;
}

function ocultarIngresso() {
  campoIngresso.hidden = true;
  ingresso.innerHTML = `<option value="">Selecione</option>`;
  ingresso.disabled = true;

  painelFiltros.classList.add("sem-ingresso");
}

function resetSelect(select) {
  select.innerHTML = `<option value="">Selecione</option>`;
  select.disabled = true;
}

function limparResultado() {
  resultado.innerHTML = "";
  statusBox.textContent = "Selecione uma disciplina ou use a busca.";
}

function normalizar(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarValor(valor) {
  return normalizar(valor);
}

function ordenarPorAula(a, b) {
  const numA = parseInt(String(a.aula || "").replace(/\D/g, ""), 10) || 0;
  const numB = parseInt(String(b.aula || "").replace(/\D/g, ""), 10) || 0;

  return numA - numB;
}

function ordenarIngressos(lista) {
  const ordemMeses = [
    "JANEIRO",
    "FEVEREIRO",
    "MARÇO",
    "MARCO",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO"
  ];

  return [...lista].sort((a, b) => {
    const aNormalizado = normalizar(a).toUpperCase();
    const bNormalizado = normalizar(b).toUpperCase();

    const posicaoA = ordemMeses.findIndex(
      mes => normalizar(mes).toUpperCase() === aNormalizado
    );

    const posicaoB = ordemMeses.findIndex(
      mes => normalizar(mes).toUpperCase() === bNormalizado
    );

    if (posicaoA !== -1 && posicaoB !== -1) {
      return posicaoA - posicaoB;
    }

    if (posicaoA !== -1) return -1;
    if (posicaoB !== -1) return 1;

    return String(a).localeCompare(String(b), "pt-BR");
  });
}

function formatarDataExibicao(valor) {
  if (!valor) return "";

  const texto = String(valor).trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    return texto;
  }

  if (/^\d{1,2}[\/.\-_\s]\d{1,2}[\/.\-_\s]\d{2,4}$/.test(texto)) {
    const partes = texto.split(/[\/.\-_\s]+/);
    const dia = partes[0].padStart(2, "0");
    const mes = partes[1].padStart(2, "0");
    let ano = partes[2];

    if (ano.length === 2) ano = "20" + ano;

    return `${dia}/${mes}/${ano}`;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    const [ano, mes, dia] = texto.slice(0, 10).split("-");
    return `${dia}/${mes}/${ano}`;
  }

  return texto;
}
