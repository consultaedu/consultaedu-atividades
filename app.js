const API_URL = "https://consultaedu-gestores-api.marcosdalleprane2.workers.dev/";

let dados = [];

const instituicao = document.getElementById("instituicao");
const turma = document.getElementById("turma");
const periodo = document.getElementById("periodo");
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

    dados = json.dados || [];

    montarAvisos(json.avisos || []);
    preencherSelect(instituicao, valoresUnicos(dados, "instituicao"));

    statusBox.textContent = `Base carregada com ${dados.length} registros. Última atualização: ${json.atualizadoEm || "-"}`;
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

function valoresUnicos(lista, campo) {
  return [...new Set(lista.map(item => item[campo]).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
}

function preencherSelect(select, valores) {
  select.innerHTML = `<option value="">Selecione</option>`;

  valores.forEach(valor => {
    const option = document.createElement("option");
    option.value = valor;
    option.textContent = valor;
    select.appendChild(option);
  });

  select.disabled = valores.length === 0;
}

instituicao.addEventListener("change", () => {
  preencherSelect(turma, valoresUnicos(filtrarDados({ instituicao: instituicao.value }), "turma"));
  resetSelect(periodo);
  resetSelect(curso);
  resetSelect(disciplina);
  limparResultado();
});

turma.addEventListener("change", () => {
  preencherSelect(periodo, valoresUnicos(filtrarDados({
    instituicao: instituicao.value,
    turma: turma.value
  }), "periodo"));

  resetSelect(curso);
  resetSelect(disciplina);
  limparResultado();
});

periodo.addEventListener("change", () => {
  preencherSelect(curso, valoresUnicos(filtrarDados({
    instituicao: instituicao.value,
    turma: turma.value,
    periodo: periodo.value
  }), "curso"));

  resetSelect(disciplina);
  limparResultado();
});

curso.addEventListener("change", () => {
  preencherSelect(disciplina, valoresUnicos(filtrarDados({
    instituicao: instituicao.value,
    turma: turma.value,
    periodo: periodo.value,
    curso: curso.value
  }), "disciplina"));

  limparResultado();
});

disciplina.addEventListener("change", renderizarResultado);
pesquisa.addEventListener("input", renderizarResultado);

function filtrarDados(filtros) {
  return dados.filter(item => {
    return Object.entries(filtros).every(([campo, valor]) => {
      return !valor || item[campo] === valor;
    });
  });
}

function renderizarResultado() {
  const textoBusca = normalizar(pesquisa.value);

  let lista = filtrarDados({
    instituicao: instituicao.value,
    turma: turma.value,
    periodo: periodo.value,
    curso: curso.value,
    disciplina: disciplina.value
  });

  if (textoBusca) {
    lista = lista.filter(item => {
      const texto = normalizar([
        item.instituicao,
        item.turma,
        item.periodo,
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
    .sort((a, b) => ordenarPorAula(a, b))
    .forEach(item => {
      resultado.appendChild(criarCard(item));
    });
}

function criarCard(item) {
  const card = document.createElement("article");
  card.className = "card";

  const statusClasse = item.status === "Completo" ? "status-completo" : "status-alerta";

  card.innerHTML = `
    <span class="status-tag ${statusClasse}">${item.status || "Verificar"}</span>
    <h3>${item.aula || "Aula"}</h3>
    <div class="meta">
      <strong>${formatarDataExibicao(item.data) || "Data não informada"}</strong><br>
      ${item.disciplina || ""}<br>
      ${item.curso || ""}
    </div>

    <div class="acoes">
      ${item.pdfAtividade ? `<a class="btn-principal" href="${item.pdfAtividade}" target="_blank">📄 Baixar atividade</a>` : ""}
      ${item.pdfLista ? `<a class="btn-principal" href="${item.pdfLista}" target="_blank">📋 Baixar lista</a>` : ""}
      ${item.pastaAula ? `<a class="btn-secundario" href="${item.pastaAula}" target="_blank">🔗 Abrir pasta</a>` : ""}
    </div>
  `;

  return card;
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

function ordenarPorAula(a, b) {
  const numA = parseInt(String(a.aula || "").replace(/\D/g, ""), 10) || 0;
  const numB = parseInt(String(b.aula || "").replace(/\D/g, ""), 10) || 0;

  return numA - numB;
}

function formatarDataExibicao(valor) {
  if (!valor) return "";

  const texto = String(valor);

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    return texto;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    const [ano, mes, dia] = texto.slice(0, 10).split("-");
    return `${dia}/${mes}/${ano}`;
  }

  return texto;
}