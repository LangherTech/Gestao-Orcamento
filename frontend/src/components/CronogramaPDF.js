import { COMPANY_LOGO_URL } from './PropostaComercialView';

export function exportCronogramaPDF(etapas, obraNome = 'Obra', clienteNome = '', obraData = null) {
  if (!etapas || etapas.length === 0) {
    alert("Não há etapas para gerar o cronograma.");
    return;
  }

  // 1. Organizar etapas principais e sub-etapas hierarquicamente
  const parentEtapas = etapas.filter(e => !e.etapa_pai_id);
  const effectiveParents = parentEtapas.length > 0 ? parentEtapas : etapas;

  const rows = [];
  let parentIndex = 1;

  effectiveParents.forEach(parent => {
    const subEtapas = (parent.sub_etapas && parent.sub_etapas.length > 0)
      ? parent.sub_etapas
      : etapas.filter(sub => sub.etapa_pai_id === parent.id);

    let pStart = parent.data_prevista_inicio || parent.data_real_inicio;
    let pEnd = parent.data_prevista_fim || parent.data_real_fim;

    if ((!pStart || !pEnd) && subEtapas.length > 0) {
      const subStarts = subEtapas.map(s => s.data_prevista_inicio || s.data_real_inicio).filter(Boolean);
      const subEnds = subEtapas.map(s => s.data_prevista_fim || s.data_real_fim).filter(Boolean);
      if (!pStart && subStarts.length > 0) pStart = subStarts.slice().sort()[0];
      if (!pEnd && subEnds.length > 0) pEnd = subEnds.slice().sort().reverse()[0];
    }

    rows.push({
      id: parent.id,
      nome: `${parentIndex}. ${parent.nome}`,
      isParent: true,
      data_inicio: pStart,
      data_fim: pEnd
    });
    parentIndex++;

    subEtapas.forEach(sub => {
      rows.push({
        id: sub.id,
        nome: sub.nome,
        isParent: false,
        data_inicio: sub.data_prevista_inicio || sub.data_real_inicio,
        data_fim: sub.data_prevista_fim || sub.data_real_fim
      });
    });
  });

  // 2. Determinar limites de datas
  let minDateStr = null;
  let maxDateStr = null;

  rows.forEach(r => {
    if (r.data_inicio) {
      if (!minDateStr || r.data_inicio < minDateStr) minDateStr = r.data_inicio;
    }
    if (r.data_fim) {
      if (!maxDateStr || r.data_fim > maxDateStr) maxDateStr = r.data_fim;
    }
  });

  if (!minDateStr || !maxDateStr) {
    alert("Datas inválidas nas etapas. Cadastre as datas de início e fim antes de exportar.");
    return;
  }

  const parseYMD = (s) => {
    if (!s) return null;
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  };

  const startDate = parseYMD(minDateStr);
  const endDate = parseYMD(maxDateStr);

  const allDays = [];
  let curr = new Date(startDate);
  while (curr <= endDate) {
    allDays.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }

  // 3. Regra de divisão em páginas (Notion: até 45 dias 1 página; acima de 45 dias, a cada 30 dias)
  let dayChunks = [];
  if (allDays.length <= 45) {
    dayChunks = [allDays];
  } else {
    for (let i = 0; i < allDays.length; i += 30) {
      dayChunks.push(allDays.slice(i, i + 30));
    }
  }

  // 4. Datas formatadas para o cabeçalho
  const formatDateBR = (dateStrOrObj) => {
    if (!dateStrOrObj) return '-';
    if (typeof dateStrOrObj === 'string' && dateStrOrObj.includes('-')) {
      const [y, m, d] = dateStrOrObj.split('-');
      return `${d}/${m}/${y}`;
    }
    const d = new Date(dateStrOrObj);
    return d.toLocaleDateString('pt-BR');
  };

  const headerInicio = (obraData && obraData.data_inicio) 
    ? formatDateBR(obraData.data_inicio) 
    : formatDateBR(minDateStr);
  const headerFim = (obraData && (obraData.data_prevista_fim || obraData.data_fim)) 
    ? formatDateBR(obraData.data_prevista_fim || obraData.data_fim) 
    : formatDateBR(maxDateStr);

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const logoHtml = COMPANY_LOGO_URL
    ? `<img src="${COMPANY_LOGO_URL}" alt="Edifica" style="height: 48px; display: block; margin: 0 auto 12px auto;" />`
    : `
      <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 12px;">
        <svg style="width: 32px; height: 32px; color: #0e2744;" viewBox="0 0 100 100" fill="currentColor">
          <path d="M22 82V34L50 14L78 34V82H64V42L50 28L36 42V82H22Z" />
          <rect x="44" y="46" width="12" height="36" rx="1" fill="currentColor" />
        </svg>
        <div style="text-align: left;">
          <div style="font-size: 22px; font-weight: 900; color: #0e2744; line-height: 1; letter-spacing: -0.5px; font-family: 'Inter', Arial, sans-serif;">
            Edifica
          </div>
          <div style="font-size: 7.5px; font-weight: 700; color: #475569; letter-spacing: 0.28em; text-transform: uppercase; margin-top: 3px; font-family: 'Inter', Arial, sans-serif;">
            SOLUÇÕES EM OBRAS
          </div>
        </div>
      </div>
    `;

  let htmlPages = '';

  dayChunks.forEach((days, chunkIndex) => {
    // Agrupar meses para o cabeçalho das colunas
    const monthHeaders = [];
    let currentMonthKey = null;
    let currentMonthNum = 0;
    let currentYearNum = 0;
    let currentMonthCount = 0;

    days.forEach(d => {
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key !== currentMonthKey) {
        if (currentMonthKey !== null) {
          monthHeaders.push({ month: currentMonthNum, year: currentYearNum, span: currentMonthCount });
        }
        currentMonthKey = key;
        currentMonthNum = d.getMonth();
        currentYearNum = d.getFullYear();
        currentMonthCount = 1;
      } else {
        currentMonthCount++;
      }
    });
    if (currentMonthCount > 0) {
      monthHeaders.push({ month: currentMonthNum, year: currentYearNum, span: currentMonthCount });
    }

    // Cabeçalho da primeira folha
    const isFirstPage = chunkIndex === 0;
    const headerHtml = isFirstPage ? `
      ${logoHtml}
      <h1 style="text-align: center; font-size: 13pt; font-weight: 900; letter-spacing: 0.05em; color: #0e2744; text-transform: uppercase; margin-bottom: 10px;">
        CRONOGRAMA DE EXECUÇÃO
      </h1>
      <div class="header">
        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 11pt;">Obra: <strong>${obraNome}</strong></p>
      </div>
    ` : '';

    // Renderizar linhas do cronograma
    const rowsHtml = rows.map(row => {
      const rowStart = row.data_inicio ? parseYMD(row.data_inicio).getTime() : null;
      const rowEnd = row.data_fim ? parseYMD(row.data_fim).getTime() : null;

      const cellsHtml = days.map((d, dIdx) => {
        const dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0).getTime();
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;

        const inRange = rowStart && rowEnd && dTime >= rowStart && dTime <= rowEnd;

        let barHtml = '';
        if (inRange) {
          const isStart = dTime === rowStart;
          const isEnd = dTime === rowEnd;

          // Classes para bordas arredondadas e margens
          const startClass = isStart ? 'is-start' : '';
          const endClass = isEnd ? 'is-end' : '';

          barHtml = `
            <div class="bar-wrapper">
              <div class="bar ${row.isParent ? 'parent' : 'sub'} ${startClass} ${endClass}"></div>
            </div>
          `;
        }

        return `
          <td class="timeline-cell ${isWeekend ? 'weekend' : ''}">
            ${barHtml}
          </td>
        `;
      }).join('');

      return `
        <tr class="gantt-row">
          <td class="task-name-cell ${row.isParent ? 'parent-task' : 'sub-task'}">
            ${row.nome}
          </td>
          ${cellsHtml}
        </tr>
      `;
    }).join('');

    htmlPages += `
      <div class="a4-page ${chunkIndex > 0 ? 'page-break' : ''}">
        ${headerHtml}
        
        <table class="gantt-table">
          <thead>
            <tr>
              <th rowspan="2" class="task-header">Etapas</th>
              ${monthHeaders.map(m => `
                <th colspan="${m.span}" class="month-header">
                  ${monthNames[m.month]} ${m.year}
                </th>
              `).join('')}
            </tr>
            <tr>
              ${days.map(d => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return `
                  <th class="day-header ${isWeekend ? 'weekend' : ''}">
                    ${d.getDate()}
                  </th>
                `;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer-bar">
          <div class="legend">
            <div class="legend-item">
              <div class="legend-color" style="background: #155e9f;"></div>
              <span>Etapa</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: #79aee4;"></div>
              <span>Sub-etapa</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: #edebe6; border: 1px solid #cbd5e1;"></div>
              <span>Fim de semana</span>
            </div>
          </div>
          <div class="page-info">
            Página ${chunkIndex + 1} de ${dayChunks.length}
          </div>
        </div>
      </div>
    `;
  });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Cronograma Visual - ${obraNome}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm 14mm 10mm 14mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #0f172a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .a4-page {
            width: 100%;
            position: relative;
            background: #ffffff;
            margin: 0 auto;
          }
          .page-break {
            page-break-before: always;
            break-before: page;
            padding-top: 5mm;
          }
          .header {
            border-bottom: 2px solid #cbd5e1;
            padding-bottom: 12px;
            margin-bottom: 20px;
            text-align: center;
          }
          .gantt-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          .task-header {
            width: 25%;
            text-align: left;
            padding: 6px 8px;
            font-size: 8.5pt;
            font-weight: 600;
            color: #475569;
            border-bottom: 1px solid #cbd5e1;
          }
          .month-header {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            text-align: center;
            font-size: 8.5pt;
            font-weight: 700;
            color: #0f172a;
            padding: 5px 2px;
          }
          .day-header {
            border: 1px solid #cbd5e1;
            text-align: center;
            font-size: 7.5pt;
            font-weight: 500;
            color: #334155;
            padding: 4px 0;
            background-color: #ffffff;
          }
          .day-header.weekend {
            background-color: #edebe6 !important;
            color: #475569;
          }
          .task-name-cell {
            width: 25%;
            padding: 5px 8px;
            font-size: 8.5pt;
            color: #0f172a;
            border-bottom: 1px solid #f1f5f9;
            border-right: 1px solid #cbd5e1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .task-name-cell.parent-task {
            font-weight: 700;
            color: #0f172a;
          }
          .task-name-cell.sub-task {
            padding-left: 22px;
            font-weight: 400;
            color: #475569;
          }
          .timeline-cell {
            padding: 0;
            height: 27px;
            border-right: 1px solid #f1f5f9;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: middle;
            background-color: #ffffff;
          }
          .timeline-cell.weekend {
            background-color: #edebe6 !important;
          }
          .bar-wrapper {
            height: 100%;
            width: 100%;
            display: flex;
            align-items: center;
          }
          .bar {
            width: 100%;
          }
          .bar.parent {
            height: 14px;
            background-color: #155e9f;
          }
          .bar.sub {
            height: 12px;
            background-color: #79aee4;
          }
          .bar.is-start {
            border-top-left-radius: 4px;
            border-bottom-left-radius: 4px;
            margin-left: 2px;
            width: calc(100% - 2px);
          }
          .bar.is-end {
            border-top-right-radius: 4px;
            border-bottom-right-radius: 4px;
            margin-right: 2px;
            width: calc(100% - 2px);
          }
          .bar.is-start.is-end {
            margin-left: 2px;
            margin-right: 2px;
            width: calc(100% - 4px);
          }
          .footer-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 18px;
            font-size: 8pt;
            color: #475569;
          }
          .legend {
            display: flex;
            align-items: center;
            gap: 20px;
          }
          .legend-item {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .legend-color {
            width: 16px;
            height: 10px;
            border-radius: 2px;
          }
          .page-info {
            font-size: 8pt;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        ${htmlPages}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

export function exportCronogramaTabelaPDF(etapas, obraNome = 'Obra', clienteNome = '') {
  if (!etapas || etapas.length === 0) {
    alert("Não há etapas para gerar o cronograma.");
    return;
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const printWindow = window.open('', '_blank');
  
  const logoHtml = COMPANY_LOGO_URL
    ? `<img src="${COMPANY_LOGO_URL}" alt="Edifica" style="height: 48px; display: block; margin: 0 auto 12px auto;" />`
    : `
      <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 12px;">
        <svg style="width: 32px; height: 32px; color: #0e2744;" viewBox="0 0 100 100" fill="currentColor">
          <path d="M22 82V34L50 14L78 34V82H64V42L50 28L36 42V82H22Z" />
          <rect x="44" y="46" width="12" height="36" rx="1" fill="currentColor" />
        </svg>
        <div style="text-align: left;">
          <div style="font-size: 22px; font-weight: 900; color: #0e2744; line-height: 1; letter-spacing: -0.5px; font-family: 'Inter', Arial, sans-serif;">
            Edifica
          </div>
          <div style="font-size: 7.5px; font-weight: 700; color: #475569; letter-spacing: 0.28em; text-transform: uppercase; margin-top: 3px; font-family: 'Inter', Arial, sans-serif;">
            SOLUÇÕES EM OBRAS
          </div>
        </div>
      </div>
    `;

  const footerHtml = `
    <div style="text-align: center; font-size: 8pt; font-weight: 600; color: #475569; line-height: 1.4; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 24px;">
      <div>RUA BENJAMIN CONSTANT, 641</div>
      <div>ESCOLA AGRICOLA – BLUMENAU/SC</div>
      <div>(47) 99138-7244</div>
    </div>
  `;

  let rowsHtml = '';
  etapas.forEach(et => {
    rowsHtml += `
      <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1;">
        <td style="padding: 10px 8px; font-size: 11pt;">${et.nome}</td>
        <td style="text-align: center; padding: 10px 8px;">${formatDate(et.data_prevista_inicio)}</td>
        <td style="text-align: center; padding: 10px 8px;">${formatDate(et.data_prevista_fim)}</td>
      </tr>
    `;
    if (et.sub_etapas && et.sub_etapas.length > 0) {
      et.sub_etapas.forEach(sub => {
        rowsHtml += `
          <tr style="border-top: 1px solid #e2e8f0;">
            <td style="padding: 8px 8px 8px 24px; color: #334155;">${sub.nome}</td>
            <td style="text-align: center; padding: 8px; color: #475569;">${formatDate(sub.data_prevista_inicio)}</td>
            <td style="text-align: center; padding: 8px; color: #475569;">${formatDate(sub.data_prevista_fim)}</td>
          </tr>
        `;
      });
    }
  });

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Cronograma Tabela - ${obraNome}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #0f172a; color: #ffffff; padding: 12px 8px; text-align: left; font-size: 10pt; text-transform: uppercase; }
          th.center { text-align: center; }
          h2 { margin: 0; font-size: 13pt; font-weight: 900; letter-spacing: 0.05em; color: #0e2744; text-transform: uppercase; text-align: center; margin-bottom: 10px; }
          .header { border-bottom: 2px solid #cbd5e1; padding-bottom: 12px; margin-bottom: 20px; text-align: center; }
          .signatures {
            display: flex;
            justify-content: space-around;
            margin-top: 48px;
            padding-top: 10px;
            page-break-inside: avoid;
          }
          .sig-box {
            text-align: center;
            width: 220px;
          }
          .sig-line {
            border-bottom: 1px solid #334155;
            margin-bottom: 5px;
          }
        </style>
      </head>
      <body>
        ${logoHtml}
        <h1 style="text-align: center; font-size: 13pt; font-weight: 900; letter-spacing: 0.05em; color: #0e2744; text-transform: uppercase; margin-bottom: 10px;">
          CRONOGRAMA DE EXECUÇÃO
        </h1>
        <div class="header">
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 11pt;">Obra: <strong>${obraNome}</strong></p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Etapa / Sub-etapa</th>
              <th class="center" style="width: 120px;">Data Início</th>
              <th class="center" style="width: 120px;">Data Fim</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div style="font-weight: 800; font-size: 8.5pt; color: #0f172a;">EDIFICA SOLUÇÕES EM OBRAS</div>
            <div style="font-size: 7.5pt; color: #475569;">Responsável Técnico / Canteiro</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div style="font-weight: 800; font-size: 8.5pt; color: #0f172a;">${(clienteNome || 'CONTRATANTE / FISCAL').toUpperCase()}</div>
            <div style="font-size: 7.5pt; color: #475569;">Fiscalização / Visto do Cliente</div>
          </div>
        </div>

        ${footerHtml}
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}
