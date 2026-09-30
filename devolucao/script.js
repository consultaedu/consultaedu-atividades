const API_URL = "https://consultaedu-devolucoes-api.marcosdalleprane2.workers.dev";
const MAX_FILE_MB = 15;
const STORAGE_KEY = "consultaedu_devolucoes_v2";

let BASE = [];
let enviando = true;

const el = id => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  preencherSemanas();
  restaurarPreferencias();
  bindEventos();
  carregarBase();
});

function bindEventos() {
  el("faculdade").addEventListener("change", () => {
    preencherPeriodoTurma();
    preencherCursos();
    preencherDisciplinas();
    salvarPreferencias();
    validarFormulario();
  });

  el("periodoTurma").addEventListener("change", () => {
    preencherCursos();
    preencherDisciplinas();
    salvarPreferencias();
    validarFormulario();
  });

  el("curso").addEventListener("change", () => {
    preencherDisciplinas();
    salvarPreferencias();
    validarFormulario();
  });

  ["disciplina", "semana"].forEach(id => {
    el(id).addEventListener("change", () => {
      salvarPreferencias();
      validarFormulario();
    });
  });

  ["polo", "gestor"].forEach(id => {
    el(id).addEventListener("input", () => {
      salvarPreferencias();
      validarFormulario();
    });
  });

  el("atividades").addEventListener("change", atualizarArquivos);
  el("listas").addEventListener("change", atualizarArquivos);
  el("uploadForm").addEventListener("submit", iniciarEnvio);

  el("btnOutraDisciplina").addEventListener("click", () => {
    limparSomenteArquivos();
    el("disciplina").value = "";
    salvarPreferencias();
    validarFormulario();
    el("sucessoCard").classList.add("hidden");
    el("progressoCard").classList.add("hidden");
    el("disciplina").focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  el("btnNovoEnvio").addEventListener("click", () => {
    limparSomenteArquivos();
    el("disciplina").value = "";
    el("curso").value = "";
    el("periodoTurma").value = "";
    el("faculdade").value = "";
    el("sucessoCard").classList.add("hidden");
    el("progressoCard").classList.add("hidden");
    preencherPeriodoTurma();
    preencherCursos();
    preencherDisciplinas();
    salvarPreferencias();
    validarFormulario();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

async function carregarBase() {
  try {
    const response = await fetch(`${API_URL}/catalog`, {
      method: "GET",
      cache: "no-store"
    });

    const data = await response.json();

    if (!response.ok || !data.sucesso) {
      throw new Error(data.mensagem || "Não foi possível carregar a base.");
    }

    BASE = Array.isArray(data.base) ? data.base : [];

    if (!BASE.length) {
      throw new Error("A base está vazia.");
    }

    preencherFaculdades();
    restaurarSelecoesDaBase();
    el("loadingBase").classList.add("hidden");

  } catch (error) {
    el("loadingBase").classList.add("hidden");
    el("erroBase").textContent = error.message || String(error);
    el("erroBase").classList.remove("hidden");
  }
}

function preencherFaculdades() {
  preencherSelect(
    el("faculdade"),
    unicos(BASE.map(i => i.faculdade)),
    "Selecione a faculdade"
  );
  el("faculdade").disabled = false;
  preencherPeriodoTurma();
}

function preencherPeriodoTurma() {
  const faculdade = el("faculdade").value;
  const select = el("periodoTurma");

  if (!faculdade) {
    preencherSelect(select, [], "Selecione a faculdade primeiro");
    select.disabled = true;
    return;
  }

  const vistos = new Set();
  const itens = [];

  BASE.filter(i => i.faculdade === faculdade).forEach(i => {
    const value = `${i.periodo}|||${i.turma}`;

    if (!vistos.has(value)) {
      vistos.add(value);
      itens.push({
        value,
        label: `${i.periodo} — Turma ${i.turma}`
      });
    }
  });

  preencherSelectObjetos(select, itens, "Selecione período / turma");
  select.disabled = itens.length === 0;
}

function preencherCursos() {
  const faculdade = el("faculdade").value;
  const pt = periodoTurmaSelecionados();
  const select = el("curso");

  if (!faculdade || !pt) {
    preencherSelect(select, [], "Selecione a turma primeiro");
    select.disabled = true;
    return;
  }

  const cursos = unicos(
    BASE.filter(i =>
      i.faculdade === faculdade &&
      i.periodo === pt.periodo &&
      i.turma === pt.turma
    ).map(i => i.curso)
  );

  preencherSelect(select, cursos, "Selecione o curso");
  select.disabled = cursos.length === 0;
}

function preencherDisciplinas() {
  const faculdade = el("faculdade").value;
  const pt = periodoTurmaSelecionados();
  const curso = el("curso").value;
  const select = el("disciplina");

  if (!faculdade || !pt || !curso) {
    preencherSelect(select, [], "Selecione o curso primeiro");
    select.disabled = true;
    return;
  }

  const disciplinas = unicos(
    BASE.filter(i =>
      i.faculdade === faculdade &&
      i.periodo === pt.periodo &&
      i.turma === pt.turma &&
      i.curso === curso
    ).map(i => i.disciplina)
  );

  preencherSelect(select, disciplinas, "Selecione a disciplina");
  select.disabled = disciplinas.length === 0;
}

function preencherSemanas() {
  const select = el("semana");
  select.innerHTML = "";

  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);

  const diaSemana = hoje.getDay();
  const deslocamento = diaSemana === 0 ? -6 : 1 - diaSemana;

  const segundaAtual = new Date(hoje);
  segundaAtual.setDate(hoje.getDate() + deslocamento);

  for (let i = 0; i <= 14; i++) {
    const inicio = new Date(segundaAtual);
    inicio.setDate(segundaAtual.getDate() - i * 7);

    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);

    const option = document.createElement("option");
    option.value = `${dataIsoLocal(inicio)}|||${dataIsoLocal(fim)}`;
    option.textContent =
      `${dataBR(inicio)} a ${dataBR(fim)}` +
      (i === 0 ? " — semana atual" : "");

    select.appendChild(option);
  }
}

function atualizarArquivos() {
  const atividades = Array.from(el("atividades").files || []);
  const listas = Array.from(el("listas").files || []);

  atualizarResumoInput("atividades", "atividadesResumo", "arquivo");
  atualizarResumoInput("listas", "listasResumo", "arquivo");

  const total = atividades.length + listas.length;
  el("totalSelecionado").textContent =
    `${total} ${total === 1 ? "arquivo selecionado" : "arquivos selecionados"}`;

  const container = el("arquivosSelecionados");
  container.innerHTML = "";

  if (!total) {
    container.classList.add("hidden");
  } else {
    container.classList.remove("hidden");
    renderGrupo(container, "ATIVIDADES", atividades);
    renderGrupo(container, "LISTAS DE PRESENÇA", listas);
  }

  validarFormulario();
}

function atualizarResumoInput(inputId, resumoId) {
  const input = el(inputId);
  const files = Array.from(input.files || []);
  const box = input.closest(".upload-box");

  if (!files.length) {
    el(resumoId).textContent = "Nenhum arquivo selecionado";
    box.classList.remove("has-files");
    return;
  }

  el(resumoId).textContent =
    `${files.length} ${files.length === 1 ? "arquivo selecionado" : "arquivos selecionados"}`;

  box.classList.add("has-files");
}

function renderGrupo(container, titulo, files) {
  if (!files.length) return;

  const group = document.createElement("div");
  group.className = "file-group";

  const title = document.createElement("div");
  title.className = "file-group-title";
  title.textContent = `${titulo} • ${files.length}`;

  group.appendChild(title);

  files.forEach(file => {
    const row = document.createElement("div");
    row.className = "file-item";

    const name = document.createElement("span");
    name.className = "file-name";
    name.textContent = file.name;

    const size = document.createElement("span");
    size.className = "file-size";
    size.textContent = formatarTamanho(file.size);

    row.append(name, size);
    group.appendChild(row);
  });

  container.appendChild(group);
}

function validarFormulario() {
  const arquivos =
    (el("atividades").files?.length || 0) +
    (el("listas").files?.length || 0);

  el("btnEnviar").disabled = !(
    el("polo").value.trim() &&
    el("gestor").value.trim() &&
    el("faculdade").value &&
    el("periodoTurma").value &&
    el("curso").value &&
    el("disciplina").value &&
    el("semana").value &&
    arquivos > 0 &&
    !enviando
  );
}

async function iniciarEnvio(event) {
  event.preventDefault();
  if (enviando) return;

  const meta = montarMetadados();

  const fila = [
    ...Array.from(el("atividades").files || []).map(file => ({ file, tipo: "ATIVIDADE" })),
    ...Array.from(el("listas").files || []).map(file => ({ file, tipo: "LISTA" }))
  ];

  const problema = validarFila(fila);
  if (problema) {
    alert(problema);
    return;
  }

  enviando = true;
  validarFormulario();
  salvarPreferencias();

  const loteId = gerarLote();

  // O progresso agora considera o tamanho real dos arquivos do lote.
  const totalBytes = fila.reduce((soma, item) => soma + item.file.size, 0) || 1;
  let bytesConcluidos = 0;

  el("progressoCard").classList.remove("hidden");
  el("sucessoCard").classList.add("hidden");
  el("resultadoLista").innerHTML = "";
  el("progressoTitulo").textContent = `Enviando ${fila.length} arquivo(s)...`;
  atualizarProgressoPercentual(0, "Preparando o primeiro arquivo...");
  el("progressoCard").scrollIntoView({ behavior: "smooth", block: "start" });

  let enviados = 0;
  let falhas = 0;

  for (let i = 0; i < fila.length; i++) {
    const item = fila[i];

    try {
      atualizarProgressoPercentual(
        (bytesConcluidos / totalBytes) * 100,
        `Preparando arquivo ${i + 1} de ${fila.length}: ${item.file.name}`
      );

      const base64 = await arquivoParaBase64(item.file);

      const payload = {
        loteId,
        ...meta,
        tipo: item.tipo,
        arquivo: {
          nome: item.file.name,
          mime: item.file.type || "application/pdf",
          tamanho: item.file.size,
          base64
        }
      };

      const data = await enviarArquivoComProgresso(
        payload,
        item.file,
        {
          indice: i,
          totalArquivos: fila.length,
          totalBytes,
          bytesConcluidos
        }
      );

      enviados++;
      adicionarResultado(true, item.file.name, data.protocolo || "Recebido");

    } catch (error) {
      falhas++;
      adicionarResultado(false, item.file.name, error.message || String(error));

    } finally {
      // O arquivo já terminou a tentativa (com sucesso ou falha).
      // A barra segue para o próximo sem ficar presa.
      bytesConcluidos += item.file.size;

      atualizarProgressoPercentual(
        (bytesConcluidos / totalBytes) * 100,
        i + 1 < fila.length
          ? `Arquivo ${i + 1} de ${fila.length} concluído. Preparando o próximo...`
          : "Finalizando o lote..."
      );
    }
  }

  enviando = false;
  validarFormulario();

  // Garante visualmente os 100% ao finalizar o lote.
  atualizarProgressoPercentual(100);

  const texto =
    `${enviados} de ${fila.length} arquivo(s) recebido(s)` +
    (falhas ? ` • ${falhas} falha(s)` : "") +
    ` • Lote ${loteId}`;

  el("progressoTitulo").textContent =
    falhas ? "Envio finalizado com atenção" : "Todos os arquivos foram enviados";

  el("progressoTexto").textContent = texto;

  el("sucessoTexto").textContent =
    falhas
      ? `${enviados} arquivo(s) chegaram e ${falhas} precisam ser reenviados.`
      : `${enviados} arquivo(s) foram recebidos e organizados no Drive.`;

  el("sucessoCard").classList.remove("hidden");
  el("sucessoCard").scrollIntoView({ behavior: "smooth", block: "center" });
}

/**
 * Faz o POST com XMLHttpRequest para termos acesso a xhr.upload.onprogress.
 *
 * 90% da "fatia" de cada arquivo representa o envio navegador -> Worker.
 * Os 10% finais ficam reservados para Worker -> Apps Script -> Google Drive.
 */
function enviarArquivoComProgresso(payload, file, contexto) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", `${API_URL}/upload`, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 180000;

    const {
      indice,
      totalArquivos,
      totalBytes,
      bytesConcluidos
    } = contexto;

    let entrouNaEtapaDrive = false;

    xhr.upload.onprogress = event => {
      if (!event.lengthComputable || !event.total) return;

      const proporcaoUpload = Math.min(1, event.loaded / event.total);

      // Deixa 10% da parcela deste arquivo para o processamento no Drive.
      const bytesVirtuaisDoArquivo =
        file.size * proporcaoUpload * 0.90;

      const percentualLote =
        ((bytesConcluidos + bytesVirtuaisDoArquivo) / totalBytes) * 100;

      atualizarProgressoPercentual(
        percentualLote,
        `Enviando arquivo ${indice + 1} de ${totalArquivos}: ${file.name}`
      );

      if (proporcaoUpload >= 0.999 && !entrouNaEtapaDrive) {
        entrouNaEtapaDrive = true;

        const percentualEsperaDrive =
          ((bytesConcluidos + file.size * 0.90) / totalBytes) * 100;

        atualizarProgressoPercentual(
          percentualEsperaDrive,
          `Upload concluído. Salvando arquivo ${indice + 1} de ${totalArquivos} no Google Drive...`
        );
      }
    };

    xhr.upload.onload = () => {
      if (entrouNaEtapaDrive) return;
      entrouNaEtapaDrive = true;

      const percentualEsperaDrive =
        ((bytesConcluidos + file.size * 0.90) / totalBytes) * 100;

      atualizarProgressoPercentual(
        percentualEsperaDrive,
        `Upload concluído. Salvando arquivo ${indice + 1} de ${totalArquivos} no Google Drive...`
      );
    };

    xhr.onload = () => {
      let data = {};

      try {
        data = JSON.parse(xhr.responseText || "{}");
      } catch (_) {
        reject(new Error("O servidor retornou uma resposta inválida."));
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300 || !data.sucesso) {
        reject(new Error(data.mensagem || `Erro HTTP ${xhr.status}`));
        return;
      }

      // Confirma os 100% da parcela deste arquivo somente quando
      // Worker + Apps Script + Drive responderem com sucesso.
      const percentualArquivoConfirmado =
        ((bytesConcluidos + file.size) / totalBytes) * 100;

      atualizarProgressoPercentual(
        percentualArquivoConfirmado,
        `Arquivo ${indice + 1} de ${totalArquivos} recebido com sucesso.`
      );

      resolve(data);
    };

    xhr.onerror = () => {
      reject(new Error("Falha de conexão durante o envio do arquivo."));
    };

    xhr.ontimeout = () => {
      reject(new Error("O envio demorou mais do que o esperado. Tente novamente."));
    };

    xhr.onabort = () => {
      reject(new Error("O envio foi interrompido."));
    };

    xhr.send(JSON.stringify(payload));
  });
}

function montarMetadados() {
  const pt = periodoTurmaSelecionados();
  const [semanaInicio, semanaFim] = el("semana").value.split("|||");

  return {
    faculdade: el("faculdade").value,
    periodo: pt.periodo,
    turma: pt.turma,
    curso: el("curso").value,
    disciplina: el("disciplina").value,
    polo: el("polo").value.trim(),
    gestor: el("gestor").value.trim(),
    semanaInicio,
    semanaFim
  };
}

function validarFila(fila) {
  if (!fila.length) return "Selecione pelo menos um PDF.";

  for (const item of fila) {
    if (!/\.pdf$/i.test(item.file.name)) {
      return `O arquivo "${item.file.name}" não é PDF.`;
    }

    if (item.file.size > MAX_FILE_MB * 1024 * 1024) {
      return `O arquivo "${item.file.name}" ultrapassa ${MAX_FILE_MB} MB.`;
    }
  }

  return "";
}

function arquivoParaBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const virgula = result.indexOf(",");
      resolve(virgula >= 0 ? result.slice(virgula + 1) : result);
    };

    reader.onerror = () => reject(new Error(`Falha ao ler ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function atualizarProgressoPercentual(percentual, texto) {
  const valor = Math.max(0, Math.min(100, Number(percentual) || 0));
  const exibido = Math.round(valor);

  el("progressoBarra").style.width = `${valor.toFixed(2)}%`;
  el("progressoPercentual").textContent = `${exibido}%`;

  if (texto) {
    el("progressoTexto").textContent = texto;
  }
}

function adicionarResultado(ok, arquivo, detalhe) {
  const row = document.createElement("div");
  row.className = `result-item ${ok ? "ok" : "error"}`;

  const a = document.createElement("span");
  a.textContent = `${ok ? "✓" : "✕"} ${arquivo}`;

  const b = document.createElement("span");
  b.textContent = detalhe;

  row.append(a, b);
  el("resultadoLista").appendChild(row);
}

function limparSomenteArquivos() {
  el("atividades").value = "";
  el("listas").value = "";
  atualizarArquivos();
}

function periodoTurmaSelecionados() {
  const value = el("periodoTurma").value;
  if (!value) return null;

  const [periodo, turma] = value.split("|||");
  return { periodo, turma };
}

function preencherSelect(select, valores, placeholder) {
  select.innerHTML = "";

  const primeira = document.createElement("option");
  primeira.value = "";
  primeira.textContent = placeholder;
  select.appendChild(primeira);

  valores.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function preencherSelectObjetos(select, itens, placeholder) {
  select.innerHTML = "";

  const primeira = document.createElement("option");
  primeira.value = "";
  primeira.textContent = placeholder;
  select.appendChild(primeira);

  itens.forEach(item => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    select.appendChild(option);
  });
}

function unicos(values) {
  return [...new Set(values.filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), "pt-BR", {
      sensitivity: "base",
      numeric: true
    }));
}

function salvarPreferencias() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      polo: el("polo").value,
      gestor: el("gestor").value,
      faculdade: el("faculdade").value,
      periodoTurma: el("periodoTurma").value,
      curso: el("curso").value,
      disciplina: el("disciplina").value,
      semana: el("semana").value
    }));
  } catch (_) {}
}

function restaurarPreferencias() {
  const pref = lerPreferencias();
  if (!pref) return;

  el("polo").value = pref.polo || "";
  el("gestor").value = pref.gestor || "";

  if (pref.semana && optionExiste(el("semana"), pref.semana)) {
    el("semana").value = pref.semana;
  }
}

function restaurarSelecoesDaBase() {
  const pref = lerPreferencias();
  if (!pref) return;

  if (pref.faculdade && optionExiste(el("faculdade"), pref.faculdade)) {
    el("faculdade").value = pref.faculdade;
  }

  preencherPeriodoTurma();

  if (pref.periodoTurma && optionExiste(el("periodoTurma"), pref.periodoTurma)) {
    el("periodoTurma").value = pref.periodoTurma;
  }

  preencherCursos();

  if (pref.curso && optionExiste(el("curso"), pref.curso)) {
    el("curso").value = pref.curso;
  }

  preencherDisciplinas();

  if (pref.disciplina && optionExiste(el("disciplina"), pref.disciplina)) {
    el("disciplina").value = pref.disciplina;
  }

  validarFormulario();
}

function lerPreferencias() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch (_) {
    return null;
  }
}

function optionExiste(select, value) {
  return Array.from(select.options).some(option => option.value === value);
}

function gerarLote() {
  const d = new Date();

  const stamp =
    `${d.getFullYear()}` +
    `${String(d.getMonth() + 1).padStart(2, "0")}` +
    `${String(d.getDate()).padStart(2, "0")}-` +
    `${String(d.getHours()).padStart(2, "0")}` +
    `${String(d.getMinutes()).padStart(2, "0")}` +
    `${String(d.getSeconds()).padStart(2, "0")}`;

  const random = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `LOTE-${stamp}-${random}`;
}

function dataIsoLocal(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function dataBR(date) {
  return [
    String(date.getDate()).padStart(2, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    date.getFullYear()
  ].join("/");
}

function formatarTamanho(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
