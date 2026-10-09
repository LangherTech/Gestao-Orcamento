import { COMPANY_LOGO_URL } from './PropostaComercialView';

export function exportCronogramaPDF(etapas, obraNome = 'Obra') {
  if (!etapas || etapas.length === 0) {
    alert("Não há etapas para gerar o cronograma.");
    return;
  }

  // 1. Encontrar as datas globais do projeto (mínima e máxima)
  let minDate = new Date('2999-12-31T00:00:00');
  let maxDate = new Date('2000-01-01T00:00:00');

  etapas.forEach(etapa => {
    const dates = [
      etapa.data_prevista_inicio,
      etapa.data_prevista_fim,
      etapa.data_real_inicio,
      etapa.data_real_fim
    ].filter(Boolean).map(d => new Date(d + 'T12:00:00'));

    dates.forEach(d => {
      if (d < minDate) minDate = d;
      if (d > maxDate) maxDate = d;
    });
  });

  if (minDate > maxDate) {
    alert("Datas inválidas nas etapas. Cadastre as datas antes de exportar.");
    return;
  }

  // Subtrair alguns dias de folga no inicio e no fim para respiro no gráfico
  minDate.setDate(minDate.getDate() - 2);
  maxDate.setDate(maxDate.getDate() + 2);

  // Criar array de todos os dias
  const allDays = [];
  let curr = new Date(minDate);
  while (curr <= maxDate) {
    allDays.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }

  // Separar em páginas de 45 dias para não espremer muito as colunas
  const chunkDays = (daysArray, chunkSize = 45) => {
    const chunks = [];
    for (let i = 0; i < daysArray.length; i += chunkSize) {
      chunks.push(daysArray.slice(i, i + chunkSize));
    }
    return chunks;
  };

  const dayChunks = chunkDays(allDays, 45);

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const logoHtml = COMPANY_LOGO_URL
    ? `<img src="${COMPANY_LOGO_URL}" alt="Edifica" style="height: 38px; display: block;" />`
    : `<div style="font-size: 22px; font-weight: 900; color: #0e2744; font-family: 'Inter', sans-serif;">Edifica</div>`;

  let htmlContent = '';

  dayChunks.forEach((days, chunkIndex) => {
    const monthHeaders = [];
    let currentMonth = -1;
    let currentMonthCount = 0;
    
    days.forEach(d => {
      if (d.getMonth() !== currentMonth) {
        if (currentMonth !== -1) {
          monthHeaders.push({ month: currentMonth, year: d.getFullYear(), span: currentMonthCount });
        }
        currentMonth = d.getMonth();
        currentMonthCount = 1;
      } else {
        currentMonthCount++;
      }
    });
    if (currentMonthCount > 0) {
      monthHeaders.push({ month: currentMonth, year: days[days.length - 1].getFullYear(), span: currentMonthCount });
    }

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    htmlContent += `
      <div class="a4-page ${chunkIndex > 0 ? 'page-break' : ''}">
        <div class="header">
          ${logoHtml}
          <div style="text-align: right;">
            <div class="title">CRONOGRAMA FÍSICO DE EXECUÇÃO</div>
            <div class="subtitle">Projeto: ${obraNome} | Página ${chunkIndex + 1} de ${dayChunks.length}</div>
          </div>
        </div>

        <table class="gantt-table">
          <thead>
            <tr>
              <th rowspan="2" class="task-col-header">Etapas do Projeto</th>
              ${monthHeaders.map(m => `<th colspan="${m.span}" class="month-header">${monthNames[m.month]} ${m.year}</th>`).join('')}
            </tr>
            <tr>
              ${days.map(d => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return `<th class="day-header ${isWeekend ? 'weekend' : ''}">${d.getDate().toString().padStart(2, '0')}</th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${etapas.map(etapa => {
              const pStart = etapa.data_prevista_inicio ? new Date(etapa.data_prevista_inicio + 'T12:00:00').getTime() : null;
              const pEnd = etapa.data_prevista_fim ? new Date(etapa.data_prevista_fim + 'T12:00:00').getTime() : null;

              const rStart = etapa.data_real_inicio ? new Date(etapa.data_real_inicio + 'T12:00:00').getTime() : null;
              const rEnd = etapa.data_real_fim ? new Date(etapa.data_real_fim + 'T12:00:00').getTime() : (rStart ? new Date().getTime() : null);

              let rowHtml = `
                <tr class="task-row">
                  <td class="task-name-cell">
                    <div style="font-weight: bold; font-size: 8pt; color: #0f172a;">${etapa.nome}</div>
                  </td>
                  ${days.map(d => {
                    const t = d.getTime();
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    
                    let cellClass = isWeekend ? 'weekend-cell' : '';
                    let innerHtml = '';

                    const isPrevisto = pStart && pEnd && t >= pStart && t <= pEnd;
                    const isRealizado = rStart && rEnd && t >= rStart && t <= rEnd;

                    if (isPrevisto && isRealizado) {
                      innerHtml = `<div class="bar-mixed"></div>`;
                    } else if (isPrevisto) {
                      innerHtml = `<div class="bar-previsto"></div>`;
                    } else if (isRealizado) {
                      innerHtml = `<div class="bar-realizado"></div>`;
                    }

                    return `<td class="${cellClass}"><div class="cell-content">${innerHtml}</div></td>`;
                  }).join('')}
                </tr>
              `;
              return rowHtml;
            }).join('')}
          </tbody>
        </table>

        <div class="legend">
          <div class="legend-item"><div class="legend-color" style="background: #cbd5e1;"></div> Período Previsto</div>
          <div class="legend-item"><div class="legend-color" style="background: #10b981;"></div> Execução Real</div>
          <div class="legend-item"><div class="legend-color" style="background: #f1f5f9; border: 1px dashed #cbd5e1;"></div> Finais de Semana</div>
        </div>
      </div>
    `;
  });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Cronograma - ${obraNome}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', Arial, sans-serif; background: #fff; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .a4-page { width: 277mm; min-height: 190mm; padding: 10mm; position: relative; margin: 0 auto; background: white; }
          .page-break { page-break-before: always; }
          
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0e2744; padding-bottom: 8px; margin-bottom: 16px; }
          .title { font-weight: 900; font-size: 14pt; color: #0e2744; text-transform: uppercase; letter-spacing: 1px; }
          .subtitle { font-size: 9pt; color: #64748b; margin-top: 4px; font-weight: 600; }
          
          .gantt-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 7pt; }
          .task-col-header { width: 25%; text-align: left; padding: 6px 8px; border: 1px solid #94a3b8; background: #f8fafc; font-size: 8pt; color: #0f172a; }
          .month-header { text-align: center; border: 1px solid #94a3b8; background: #e2e8f0; padding: 3px; font-weight: 800; font-size: 7.5pt; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
          .day-header { text-align: center; border: 1px solid #94a3b8; padding: 3px 0; color: #475569; font-weight: 600; }
          .day-header.weekend { background: #f1f5f9; color: #94a3b8; }
          
          .task-row td { border: 1px solid #cbd5e1; height: 28px; }
          .task-name-cell { padding: 4px 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: #f8fafc; border-right: 2px solid #94a3b8; }
          
          .weekend-cell { background: #f8fafc; }
          .cell-content { width: 100%; height: 100%; padding: 2px 0; display: flex; flex-direction: column; justify-content: center; align-items: center; }
          
          .bar-previsto { background: #cbd5e1; height: 8px; width: 100%; border-radius: 2px; }
          .bar-realizado { background: #10b981; height: 8px; width: 100%; border-radius: 2px; }
          .bar-mixed { height: 18px; width: 100%; position: relative; }
          .bar-mixed::before { content: ''; position: absolute; top: 1px; left: 0; right: 0; height: 6px; background: #cbd5e1; border-radius: 2px; }
          .bar-mixed::after { content: ''; position: absolute; bottom: 1px; left: 0; right: 0; height: 6px; background: #10b981; border-radius: 2px; }
          
          .legend { display: flex; gap: 20px; margin-top: 24px; font-size: 8.5pt; font-weight: 600; color: #475569; justify-content: center; }
          .legend-item { display: flex; align-items: center; gap: 6px; }
          .legend-color { width: 18px; height: 10px; border-radius: 2px; }
        </style>
      </head>
      <body>
        \${htmlContent}
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
