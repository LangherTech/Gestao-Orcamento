import { EDIFICA_COMPANY_DATA, COMPANY_LOGO_URL } from './PropostaComercialView';

export function printRDO(rdo) {
  const {
    obra_nome = 'Obra Avulsa / Geral',
    obra_cliente = '',
    data = new Date().toISOString().split('T')[0],
    clima_manha = 'Ensolarado',
    clima_tarde = 'Ensolarado',
    status_trabalho = 'praticavel',
    equipe_presente = [],
    total_trabalhadores = 0,
    atividades_realizadas = '',
    materiais_utilizados = '',
    equipamentos = '',
    dds_tema = '',
    ocorrencias = '',
    observacoes = '',
    fotos = []
  } = rdo;

  const dataFormatada = data
    ? (data.includes('-') ? data.split('-').reverse().join('/') : data)
    : new Date().toLocaleDateString('pt-BR');

  const statusLabel = status_trabalho === 'impraticavel_chuva'
    ? 'IMPRATICÁVEL (Intempérie / Chuva)'
    : (status_trabalho === 'parcial' ? 'TRABALHO PARCIAL' : 'PRATICÁVEL (Normal)');

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

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

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>RDO - ${obra_nome} - ${dataFormatada}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 14mm 16mm 14mm 16mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            background: #fff;
            color: #0f172a;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 9pt;
            line-height: 1.45;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header-box {
            border: 1px solid #cbd5e1;
            background: #f8fafc;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 12px;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 8px;
          }
          .section-title {
            font-size: 9pt;
            font-weight: 800;
            color: #0e2744;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            background: #e2e8f0;
            padding: 4px 8px;
            border-left: 3px solid #0e2744;
            margin-top: 10px;
            margin-bottom: 6px;
          }
          .content-box {
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 8px 10px;
            font-size: 8.8pt;
            color: #1e293b;
            min-height: 28px;
          }
          .tag {
            display: inline-block;
            background: #e2e8f0;
            color: #1e293b;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 8pt;
            font-weight: 600;
            margin-right: 4px;
            margin-bottom: 4px;
          }
          .photo-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-top: 8px;
          }
          .photo-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            overflow: hidden;
            background: #f8fafc;
            text-align: center;
          }
          .photo-card img {
            width: 100%;
            height: 140px;
            object-fit: cover;
            display: block;
          }
          .photo-desc {
            padding: 4px 6px;
            font-size: 7.5pt;
            color: #334155;
            font-weight: 600;
            background: #fff;
            border-top: 1px solid #e2e8f0;
          }
          .signatures {
            display: flex;
            justify-content: space-around;
            margin-top: 36px;
            padding-top: 10px;
          }
          .sig-box {
            text-align: center;
            width: 220px;
          }
          .sig-line {
            border-bottom: 1px solid #334155;
            margin-bottom: 5px;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
        </style>
      </head>
      <body>

        ${logoHtml}

        <h1 style="text-align: center; font-size: 13pt; font-weight: 900; letter-spacing: 0.05em; color: #0e2744; text-transform: uppercase; margin-bottom: 10px;">
          RELATÓRIO DIÁRIO DE OBRA — RDO
        </h1>

        <!-- DADOS DA OBRA E DO APONTAMENTO -->
        <div class="header-box">
          <div class="grid-3" style="margin-bottom: 6px;">
            <div>
              <span style="font-weight: 700; color: #475569; font-size: 8pt; display: block;">OBRA:</span>
              <span style="font-weight: 800; font-size: 9.5pt; color: #0e2744;">${obra_nome}</span>
            </div>
            <div>
              <span style="font-weight: 700; color: #475569; font-size: 8pt; display: block;">CLIENTE:</span>
              <span style="font-weight: 700; color: #1e293b;">${obra_cliente || 'Edifica Gestão'}</span>
            </div>
            <div>
              <span style="font-weight: 700; color: #475569; font-size: 8pt; display: block;">DATA DO APONTAMENTO:</span>
              <span style="font-weight: 800; font-size: 9.5pt; color: #0e2744;">${dataFormatada}</span>
            </div>
          </div>

          <div class="grid-3" style="border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 6px;">
            <div>
              <span style="font-weight: 700; color: #475569; font-size: 8pt; display: block;">CONDIÇÃO DE TRABALHO:</span>
              <span style="font-weight: 800; color: ${status_trabalho === 'impraticavel_chuva' ? '#b91c1c' : '#047857'};">
                ${statusLabel}
              </span>
            </div>
            <div>
              <span style="font-weight: 700; color: #475569; font-size: 8pt; display: block;">CLIMA MANHÃ:</span>
              <span style="font-weight: 600;">${clima_manha}</span>
            </div>
            <div>
              <span style="font-weight: 700; color: #475569; font-size: 8pt; display: block;">CLIMA TARDE:</span>
              <span style="font-weight: 600;">${clima_tarde}</span>
            </div>
          </div>
        </div>

        <!-- EFETIVO NO CANTEIRO -->
        <div class="section-title">1. EFETIVO NO CANTEIRO (Total: ${total_trabalhadores || equipe_presente.length} profissionais)</div>
        <div class="content-box">
          ${equipe_presente && equipe_presente.length > 0
            ? equipe_presente.map(e => `<span class="tag">✓ ${e}</span>`).join('')
            : '<span style="color: #64748b; font-style: italic;">Nenhum profissional listado individualmente.</span>'
          }
        </div>

        <!-- ATIVIDADES REALIZADAS -->
        <div class="section-title">2. ATIVIDADES DESENVOLVIDAS NO DIA</div>
        <div class="content-box" style="white-space: pre-wrap; min-height: 48px;">
          ${atividades_realizadas || 'Nenhuma atividade informada.'}
        </div>

        <!-- MATERIAIS E EQUIPAMENTOS -->
        <div class="grid-2" style="margin-top: 4px;">
          <div>
            <div class="section-title">3. MATERIAIS & ENTREGAS</div>
            <div class="content-box" style="white-space: pre-wrap; min-height: 40px;">
              ${materiais_utilizados || 'Sem recebimentos ou consumo relevante no dia.'}
            </div>
          </div>
          <div>
            <div class="section-title">4. EQUIPAMENTOS EM USO</div>
            <div class="content-box" style="white-space: pre-wrap; min-height: 40px;">
              ${equipamentos || 'Equipamentos e ferramentas manuais padrão em operação.'}
            </div>
          </div>
        </div>

        <!-- SEGURANÇA E OCORRÊNCIAS -->
        <div class="grid-2" style="margin-top: 4px;">
          <div>
            <div class="section-title">5. SEGURANÇA DO TRABALHO & DDS</div>
            <div class="content-box" style="white-space: pre-wrap; min-height: 38px;">
              ${dds_tema
                ? `<strong>Tema do DDS:</strong> ${dds_tema}<br/><span style="color: #047857;">Uso de EPIs conferido e aprovado.</span>`
                : 'Diálogo de Segurança e uso integral de EPIs obrigatórios realizado.'}
            </div>
          </div>
          <div>
            <div class="section-title">6. OCORRÊNCIAS & IMPREVISTOS</div>
            <div class="content-box" style="white-space: pre-wrap; min-height: 38px;">
              ${ocorrencias || 'Nenhum imprevisto ou paralisação registrada.'}
            </div>
          </div>
        </div>

        ${observacoes ? `
          <div class="section-title">7. OBSERVAÇÕES DA FISCALIZAÇÃO</div>
          <div class="content-box" style="white-space: pre-wrap;">
            ${observacoes}
          </div>
        ` : ''}

        <!-- REGISTRO FOTOGRÁFICO (Se houver fotos) -->
        ${fotos && fotos.length > 0 ? `
          <div style="${fotos.length > 2 ? 'page-break-before: always;' : ''}">
            <div class="section-title" style="margin-top: 14px;">REGISTRO FOTOGRÁFICO (${fotos.length} ${fotos.length === 1 ? 'foto' : 'fotos'})</div>
            <div class="photo-grid">
              ${fotos.map((f, i) => `
                <div class="photo-card">
                  <img src="${f.url}" alt="Foto ${i + 1}" onerror="this.src='https://placehold.co/600x400?text=Foto+indisponivel'" />
                  <div class="photo-desc">${f.descricao || `Foto #${i + 1} - Registro de campo`}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- ASSINATURAS -->
        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div style="font-weight: 800; font-size: 8.5pt; color: #0f172a;">EDIFICA SOLUÇÕES EM OBRAS</div>
            <div style="font-size: 7.5pt; color: #475569;">Responsável Técnico / Canteiro</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div style="font-weight: 800; font-size: 8.5pt; color: #0f172a;">${(obra_cliente || 'CONTRATANTE / FISCAL').toUpperCase()}</div>
            <div style="font-size: 7.5pt; color: #475569;">Fiscalização / Visto do Cliente</div>
          </div>
        </div>

        ${footerHtml}

      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}
