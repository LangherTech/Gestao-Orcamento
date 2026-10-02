import React, { useState } from 'react';
import { Download, Printer, ArrowLeft, Eye, CheckCircle2, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

// ========================================================
// LOGO OFICIAL DA EDIFICA SOLUÇÕES EM OBRAS
// Quando fornecer o arquivo oficial da logo (PNG/SVG/JPG),
// basta inserir o caminho ou URL na variável abaixo:
// ========================================================
export const COMPANY_LOGO_URL = 'https://res.cloudinary.com/doaewgeqp/image/upload/v1773234218/logo_edifica_fw3p0t.png'; // Ex: '/logo-edifica.png' ou URL importada

export function EdificaOfficialLogo({ className = "h-12", isPrint = false }) {
  if (COMPANY_LOGO_URL) {
    return (
      <img
        src={COMPANY_LOGO_URL}
        alt="Edifica Soluções em Obras"
        className={`${className} object-contain mx-auto`}
      />
    );
  }

  // Símbolo vetorial estilizado fiel à identidade visual da Edifica
  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      <div className="flex items-center gap-3">
        {/* Ícone Arquitetônico Edifica */}
        <svg className="w-10 h-10 shrink-0 text-[#0e2744]" viewBox="0 0 100 100" fill="currentColor">
          <path d="M22 82V34L50 14L78 34V82H64V42L50 28L36 42V82H22Z" />
          <rect x="44" y="46" width="12" height="36" rx="1" fill="currentColor" />
        </svg>
        <div className="flex flex-col text-left">
          <span
            className="text-3xl font-black tracking-tight text-[#0e2744] leading-none"
            style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
          >
            Edifica
          </span>
          <span
            className="text-[8px] font-bold tracking-[0.3em] text-[#475569] uppercase mt-1 leading-none"
            style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
          >
            SOLUÇÕES EM OBRAS
          </span>
        </div>
      </div>
    </div>
  );
}

// ========================================================
// DADOS DA EMPRESA (PADRÃO CONTRATUAL)
// ========================================================
export const EDIFICA_COMPANY_DATA = {
  razaoSocial: 'EDIFICA SOLUÇÕES EM OBRAS LTDA',
  nomeFantasia: 'EDIFICA SOLUÇÕES EM OBRAS',
  cnpj: '62.829.765/0001-96',
  telefone: '(47) 99138-7244',
  email: 'marcio@solucoesedifica.com.br',
  responsavel: 'Márcio Gil Paycorich',
  enderecoRodape: [
    'RUA BENJAMIN CONSTANT, 641',
    'ESCOLA AGRICOLA – BLUMENAU/SC',
    '(47) 99138-7244'
  ],
  dadosBancarios: {
    banco: 'Conta Banco 336 – C6',
    agencia: '0001',
    contaCorrente: '40058820-0',
    pix: '62.829.765/0001-96'
  }
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

// ========================================================
// DISPARADOR DE IMPRESSÃO / GERAÇÃO DE PDF
// ========================================================
export function printPropostaComercial(data, modoVisualizacao = 'resumido') {
  const {
    clienteNome = '',
    clienteEndereco = 'BLUMENAU',
    clienteTelefone = '',
    clienteEmail = '',
    clienteContato = '',
    dataEmissao = new Date().toLocaleDateString('pt-BR'),
    itens = [],
    valorTotal = 0,
    margemBdiPercentual = 15.0,
    impostosPercentual = 20.5,
    validadeDias = 15,
    prazoDias = 10,
    prazoGarantia = '12 (doze) meses',
    objetivoCustom = '',
    observacoesCustom = '',
    condicoesPagamentoCustom = '',
  } = data;

  const contatoExibicao = [clienteTelefone, clienteEmail].filter(Boolean).join(' • ') || clienteContato || '(47) 99138-7244';

  const itensAtivos = itens.filter(i => Number(i.quantidade) > 0);

  const objetivoTexto = objetivoCustom || (itensAtivos.length > 0
    ? `Execução dos serviços de ${itensAtivos.map(i => i.servico_nome).join(', ')} contemplando:`
    : 'Execução dos serviços especializados de construção civil e reforma contemplando:');

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const logoHtml = COMPANY_LOGO_URL
    ? `<img src="${COMPANY_LOGO_URL}" alt="Edifica" style="height: 52px; display: block; margin: 0 auto;" />`
    : `
      <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 24px;">
        <svg style="width: 38px; height: 38px; color: #0e2744;" viewBox="0 0 100 100" fill="currentColor">
          <path d="M22 82V34L50 14L78 34V82H64V42L50 28L36 42V82H22Z" />
          <rect x="44" y="46" width="12" height="36" rx="1" fill="currentColor" />
        </svg>
        <div style="text-align: left;">
          <div style="font-size: 26px; font-weight: 900; color: #0e2744; line-height: 1; letter-spacing: -0.5px; font-family: 'Inter', Arial, sans-serif;">
            Edifica
          </div>
          <div style="font-size: 8px; font-weight: 700; color: #475569; letter-spacing: 0.28em; text-transform: uppercase; margin-top: 4px; font-family: 'Inter', Arial, sans-serif;">
            SOLUÇÕES EM OBRAS
          </div>
        </div>
      </div>
    `;

  const footerHtml = `
    <div style="text-align: center; font-size: 8.5pt; font-weight: 600; color: #475569; line-height: 1.45; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 24px;">
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
        <title>Proposta Comercial - ${clienteNome || 'Edifica'}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 16mm 18mm 16mm 18mm;
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
            font-size: 10pt;
            line-height: 1.55;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
          .a4-page {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 254mm;
            padding-bottom: 2mm;
          }
          .section-title {
            font-size: 10.5pt;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            margin-top: 14px;
            margin-bottom: 6px;
          }
          .check-item {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin-bottom: 5px;
            font-size: 9.8pt;
            color: #1e293b;
          }
          .check-mark {
            font-weight: 900;
            color: #0f172a;
            flex-shrink: 0;
          }
          .strong-label {
            font-weight: 700;
            color: #0f172a;
          }
          .signature-line {
            border-bottom: 1px solid #334155;
            width: 320px;
            margin-top: 36px;
            margin-bottom: 6px;
          }
        </style>
      </head>
      <body>

        <!-- PÁGINA 1 -->
        <div class="a4-page page-break">
          <div>
            ${logoHtml}

            <h1 style="text-align: center; font-size: 14pt; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 20px; color: #0f172a;">
              PROPOSTA COMERCIAL
            </h1>

            <div style="margin-bottom: 16px;">
              <div style="font-weight: 800; font-size: 10.5pt; color: #0f172a;">EDIFICA SOLUÇÕES EM OBRAS</div>
              <div>CNPJ: 62.829.765/0001-96</div>
              <div>Telefone: (47) 99138-7244</div>
              <div>E-mail: marcio@solucoesedifica.com.br</div>
            </div>

            <div style="margin-bottom: 18px;">
              <div style="font-weight: 800; font-size: 10.5pt; color: #0f172a; margin-bottom: 2px;">DADOS DO CLIENTE</div>
              <div><span class="strong-label">Cliente:</span> ${clienteNome || 'Não informado'}</div>
              <div><span class="strong-label">Endereço:</span> ${clienteEndereco || 'BLUMENAU'}</div>
              <div><span class="strong-label">Data:</span> ${dataEmissao}</div>
              <div><span class="strong-label">Contato:</span> ${contatoExibicao}</div>
            </div>

            <div class="section-title">1. OBJETIVO</div>
            <div style="margin-bottom: 12px; font-size: 9.8pt;">
              ${objetivoTexto}
            </div>

            <div class="section-title">2. SERVIÇOS A EXECUTAR</div>
            <div style="margin-bottom: 12px;">
              ${itensAtivos.length > 0 ? itensAtivos.map(i => `
                <div class="check-item">
                  <span class="check-mark">✓</span>
                  <span>${i.servico_nome}${i.quantidade > 1 ? ` (${i.quantidade} un)` : ''};</span>
                </div>
              `).join('') : `
                <div class="check-item"><span class="check-mark">✓</span><span>Execução dos serviços técnicos acordados em memorial descritivo;</span></div>
                <div class="check-item"><span class="check-mark">✓</span><span>Instalação, preparação de superfície e acabamento;</span></div>
                <div class="check-item"><span class="check-mark">✓</span><span>Testes e verificação de funcionamento;</span></div>
              `}
            </div>

            <div class="section-title">3. POR CONTA DA CONTRATANTE</div>
            <div style="margin-bottom: 12px;">
              <div class="check-item"><span class="check-mark">✓</span><span>Liberação da área para trabalho;</span></div>
              <div class="check-item"><span class="check-mark">✓</span><span>Fornecimento de energia elétrica e água no local;</span></div>
              <div class="check-item"><span class="check-mark">✓</span><span>Fornecimento de materiais quando não contemplados no escopo contratado.</span></div>
            </div>

            <div class="section-title">4. POR CONTA DA CONTRATADA</div>
            <div>
              <div class="check-item"><span class="check-mark">✓</span><span>Executar todos os serviços descritos nesta proposta com qualidade técnica, seguindo normas vigentes e boas práticas da construção civil;</span></div>
              <div class="check-item"><span class="check-mark">✓</span><span>Fornecer mão de obra qualificada, equipamentos e ferramentas necessárias para a execução dos serviços;</span></div>
              <div class="check-item"><span class="check-mark">✓</span><span>Cumprir o cronograma previamente estabelecido, salvo imprevistos de força maior;</span></div>
              <div class="check-item"><span class="check-mark">✓</span><span>Manter o local de trabalho organizado e realizar a limpeza básica ao final de cada jornada;</span></div>
              <div class="check-item"><span class="check-mark">✓</span><span>Zelar pelos materiais fornecidos pelo cliente, evitando desperdícios e danos;</span></div>
            </div>
          </div>

          ${footerHtml}
        </div>

        <!-- PÁGINA 2 -->
        <div class="a4-page page-break">
          <div>
            ${logoHtml}

            <div class="section-title" style="margin-top: 10px;">5. VALORES</div>
            <div class="check-item" style="margin-bottom: 8px;">
              <span class="check-mark">✓</span>
              <span>Os valores abaixo contemplam mão de obra especializada e insumos para execução dos trabalhos, citados acima.</span>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px;">
              ${itensAtivos.map(i => {
                const bdi = margemBdiPercentual || 0;
                const imp = impostosPercentual || 0;
                const fatorAcrescimo = 1 + ((bdi + imp) / 100);
                const isCliente = i.fornecido_por === 'Cliente';
                const sub = isCliente ? 0 : i.preco_unitario * i.quantidade * (1 - (i.desconto_percentual || 0) / 100) * fatorAcrescimo;
                const unitFinal = isCliente ? 0 : i.preco_unitario * (1 - (i.desconto_percentual || 0) / 100) * fatorAcrescimo;
                
                let html = `
                  <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 9.8pt; border-bottom: 1px dashed #e2e8f0;">
                    <span>${i.servico_nome} ${i.quantidade > 1 ? `<span style="color: #64748b;">(${i.quantidade} un)</span>` : ''} ${isCliente ? '<span style="color:#d97706; font-size:8pt; font-weight:bold; margin-left:4px;">(Fornecido pelo Cliente)</span>' : ''}</span>
                    <span style="font-weight: 600;">${isCliente ? '-' : formatCurrency(sub)}</span>
                  </div>
                `;

                if (modoVisualizacao === 'detalhado') {
                    html += `
                      <div style="padding-left: 12px; margin-bottom: 8px; font-size: 8.5pt; color: #64748b; line-height: 1.4;">
                        <div><span style="font-weight: 600;">Valor Unitário:</span> ${formatCurrency(unitFinal)}</div>
                    `;
                    if (i.mao_de_obra > 0) {
                      html += `<div><span style="font-weight: 600;">Mão de Obra:</span> ${formatCurrency(i.mao_de_obra)}</div>`;
                    }
                    if (i.materiais && i.materiais.length > 0) {
                      html += `<div style="margin-top: 3px;"><span style="font-weight: 600;">Materiais Inclusos:</span> ${i.materiais.map(m => m.material_nome || m.nome).join(', ')}</div>`;
                    }
                    html += `</div>`;
                }

                return html;
              }).join('')}
              <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 8px; border-top: 2px solid #cbd5e1; font-weight: 800; font-size: 11.5pt; color: #0e2744;">
                <span>VALOR TOTAL:</span>
                <span>${formatCurrency(valorTotal)}</span>
              </div>
            </div>

            <div class="section-title">6. OBSERVAÇÕES</div>
            <div style="margin-bottom: 14px;">
              <div class="check-item"><span class="check-mark">✓</span><span>O valor informado já inclui mão de obra, encargos, alimentação da equipe, deslocamento e impostos, não havendo custos adicionais ao cliente além do escopo contratado acima.</span></div>
              <div class="check-item"><span class="check-mark">✓</span><span>Caso haja alteração da área a proposta será refeita.</span></div>
              <div class="check-item"><span class="check-mark">✓</span><span>Serviços realizados conforme normas de segurança.</span></div>
              ${observacoesCustom ? `<div class="check-item"><span class="check-mark">✓</span><span>${observacoesCustom}</span></div>` : ''}
            </div>

            <div class="section-title">7. CONDIÇÕES DE PAGAMENTO</div>
            <div style="margin-bottom: 14px;">
              <div>O pagamento pelos serviços será realizado da seguinte forma:</div>
              ${condicoesPagamentoCustom ? `
                <div class="check-item" style="margin-top: 5px;"><span class="check-mark">✓</span><span>${condicoesPagamentoCustom}</span></div>
              ` : `
                <div class="check-item" style="margin-top: 5px;"><span class="check-mark">✓</span><span><strong>50% (cinquenta por cento)</strong> do valor total na assinatura da proposta/contrato, a título de entrada, para mobilização de equipe, compra de insumos e início dos serviços;</span></div>
                <div class="check-item"><span class="check-mark">✓</span><span><strong>50% (cinquenta por cento)</strong> restantes na conclusão dos serviços, mediante aprovação do contratante.</span></div>
              `}
            </div>

            <div class="section-title">8. DADOS BANCÁRIOS</div>
            <div style="background: #f8fafc; border-left: 4px solid #0e2744; padding: 10px 14px; margin-bottom: 14px; font-size: 9.8pt;">
              <div>Conta Banco 336 – C6</div>
              <div>Agência: 0001</div>
              <div>Conta Corrente: 40058820-0</div>
              <div><strong>Pix CNPJ: 62.829.765/0001-96</strong></div>
            </div>

            <div class="section-title">9. DOS PRAZOS PARA REALIZAÇÃO</div>
            <div class="check-item">
              <span class="check-mark">✓</span>
              <span><strong>${prazoDias} dias úteis</strong> da assinatura da proposta/Contrato</span>
            </div>
          </div>

          ${footerHtml}
        </div>

        <!-- PÁGINA 3 -->
        <div class="a4-page">
          <div>
            ${logoHtml}

            <div class="section-title" style="margin-top: 14px;">10. GARANTIAS</div>
            <div style="text-align: justify; margin-bottom: 18px; font-size: 9.8pt; line-height: 1.6;">
              A <strong>Edifica Soluções em Obras Ltda.</strong> responsabiliza-se pela qualidade, eficiência e perfeito funcionamento do serviço executado, garantindo-o pelo prazo de <strong>${prazoGarantia}</strong>, desde que utilizado adequadamente, ou seja, sem danos causados por uso inadequado ou intervenções de terceiros na área tratada.
            </div>

            <div class="section-title">11. VALIDADE</div>
            <div style="margin-bottom: 24px; font-size: 9.8pt; line-height: 1.6;">
              <div>Esta proposta é válida para <strong>${validadeDias} dias corridos</strong>.</div>
              <div style="margin-top: 6px;">Agradecendo a atenção e permanecendo no aguardo de vossa manifestação, firmamo-nos.</div>
            </div>

            <div style="margin-top: 40px; margin-bottom: 10px; font-size: 10pt;">
              Atenciosamente,
            </div>

            <!-- Bloco de Assinaturas -->
            <div style="margin-top: 45px;">
              <div class="signature-line"></div>
              <div style="font-weight: 800; font-size: 10.5pt; color: #0f172a;">EDIFICA SOLUÇÕES EM OBRAS LTDA</div>
              <div style="font-size: 9.8pt; color: #475569;">Márcio Gil Paycorich</div>
            </div>

            <div style="margin-top: 60px;">
              <div style="font-size: 10pt; color: #0f172a; margin-bottom: 6px;">
                De acordo: __________________________________________________________________
              </div>
              <div style="font-weight: 800; font-size: 10.5pt; color: #0f172a; margin-left: 80px;">
                ${(clienteNome || 'NOME DO CLIENTE').toUpperCase()}
              </div>
            </div>
          </div>

          ${footerHtml}
        </div>

      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

// ========================================================
// COMPONENTE DE PRÉ-VISUALIZAÇÃO INTERATIVA EM TELA
// ========================================================
export function PropostaComercialPreviewModal({
  data,
  onClose,
  onBackToEdit,
  readOnlyView = false,
  onSave = null,
  saving = false
}) {
  const [currentPage, setCurrentPage] = useState(1); // 1, 2, 3 ou 0 (todos)
  const [modoVisualizacao, setModoVisualizacao] = useState('resumido'); // 'resumido' ou 'detalhado'

  const {
    clienteNome = '',
    clienteEndereco = 'BLUMENAU / SC',
    clienteTelefone = '',
    clienteEmail = '',
    clienteContato = '',
    dataEmissao = new Date().toLocaleDateString('pt-BR'),
    itens = [],
    valorTotal = 0,
    margemBdiPercentual = 15.0,
    impostosPercentual = 20.5,
    validadeDias = 15,
    prazoDias = 10,
    prazoGarantia = '12 (doze) meses',
    objetivoCustom = '',
    observacoesCustom = '',
    condicoesPagamentoCustom = '',
  } = data;

  const contatoExibicao = [clienteTelefone, clienteEmail].filter(Boolean).join(' • ') || clienteContato || '(47) 99138-7244';
  const itensAtivos = itens.filter(i => Number(i.quantidade) > 0);

  const objetivoTexto = objetivoCustom || (itensAtivos.length > 0
    ? `Execução dos serviços de ${itensAtivos.map(i => i.servico_nome).join(', ')} contemplando:`
    : 'Execução dos serviços especializados de construção civil e reforma contemplando:');

  return (
    <div className="space-y-5">
      {/* Barra Superior de Controles e Ações */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {!readOnlyView && onBackToEdit && (
            <button
              type="button"
              onClick={onBackToEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para Edição</span>
            </button>
          )}

          {/* Seletor de visualização de páginas */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setCurrentPage(1)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${currentPage === 1 ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Página 1
            </button>
            <button
              onClick={() => setCurrentPage(2)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${currentPage === 2 ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Página 2
            </button>
            <button
              onClick={() => setCurrentPage(3)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${currentPage === 3 ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Página 3
            </button>
            <button
              onClick={() => setCurrentPage(0)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${currentPage === 0 ? 'bg-blue-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
            >
              Ver Todas
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900 border border-slate-700 rounded-xl p-1 mr-2 text-xs">
            <button
              onClick={() => setModoVisualizacao('resumido')}
              className={`px-3 py-1 rounded-lg transition-colors ${modoVisualizacao === 'resumido' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Resumido
            </button>
            <button
              onClick={() => setModoVisualizacao('detalhado')}
              className={`px-3 py-1 rounded-lg transition-colors ${modoVisualizacao === 'detalhado' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Detalhado
            </button>
          </div>

          <button
            type="button"
            onClick={() => printPropostaComercial(data, modoVisualizacao)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / Salvar PDF</span>
          </button>

          {!readOnlyView && onSave && (
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saving ? 'Salvando...' : 'Salvar Orçamento'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Container que simula folhas de papel A4 oficiais */}
      <div className="space-y-6 max-h-[72vh] overflow-y-auto pr-1">
        {/* PÁGINA 1 */}
        {(currentPage === 1 || currentPage === 0) && (
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 p-10 max-w-3xl mx-auto text-slate-900 text-[13px] leading-relaxed relative flex flex-col justify-between min-h-[920px]">
            <div>
              <div className="mb-4">
                <EdificaOfficialLogo />
              </div>

              <h2 className="text-center text-lg font-extrabold text-slate-900 uppercase tracking-wider mb-6">
                PROPOSTA COMERCIAL
              </h2>

              <div className="mb-4 text-xs">
                <p className="font-extrabold text-sm text-slate-900">EDIFICA SOLUÇÕES EM OBRAS</p>
                <p className="text-slate-700">CNPJ: 62.829.765/0001-96</p>
                <p className="text-slate-700">Telefone: (47) 99138-7244</p>
                <p className="text-slate-700">E-mail: marcio@solucoesedifica.com.br</p>
              </div>

              <div className="mb-5 text-xs">
                <p className="font-extrabold text-sm text-slate-900 mb-1">DADOS DO CLIENTE</p>
                <p><span className="font-bold text-slate-900">Cliente:</span> {clienteNome || 'Não informado'}</p>
                <p><span className="font-bold text-slate-900">Endereço:</span> {clienteEndereco || 'BLUMENAU'}</p>
                <p><span className="font-bold text-slate-900">Data:</span> {dataEmissao}</p>
                <p><span className="font-bold text-slate-900">Contato:</span> {contatoExibicao}</p>
              </div>

              <div className="font-extrabold text-xs uppercase text-slate-900 mt-4 mb-1">1. OBJETIVO</div>
              <p className="text-xs text-slate-700 mb-4">{objetivoTexto}</p>

              <div className="font-extrabold text-xs uppercase text-slate-900 mb-2">2. SERVIÇOS A EXECUTAR</div>
              <div className="space-y-1 text-xs text-slate-700 mb-4 pl-1">
                {itensAtivos.length > 0 ? (
                  itensAtivos.map((it, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="font-black text-slate-900">✓</span>
                      <span>{it.servico_nome} {it.quantidade > 1 ? `(${it.quantidade} un)` : ''};</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-start gap-2">
                    <span className="font-black text-slate-900">✓</span>
                    <span>Execução técnica conforme orientações do cliente e memorial;</span>
                  </div>
                )}
              </div>

              <div className="font-extrabold text-xs uppercase text-slate-900 mb-2">3. POR CONTA DA CONTRATANTE</div>
              <div className="space-y-1 text-xs text-slate-700 mb-4 pl-1">
                <div className="flex items-start gap-2"><span className="font-black text-slate-900">✓</span><span>Liberação da área para trabalho;</span></div>
                <div className="flex items-start gap-2"><span className="font-black text-slate-900">✓</span><span>Fornecimento de energia elétrica e água no local;</span></div>
                <div className="flex items-start gap-2"><span className="font-black text-slate-900">✓</span><span>Fornecimento de todo material especificado não incluso nesta proposta.</span></div>
              </div>

              <div className="font-extrabold text-xs uppercase text-slate-900 mb-2">4. POR CONTA DA CONTRATADA</div>
              <div className="space-y-1 text-xs text-slate-700 pl-1">
                <div className="flex items-start gap-2"><span className="font-black text-slate-900">✓</span><span>Executar todos os serviços descritos nesta proposta com qualidade técnica, seguindo normas vigentes e boas práticas da construção civil;</span></div>
                <div className="flex items-start gap-2"><span className="font-black text-slate-900">✓</span><span>Fornecer mão de obra qualificada, equipamentos e ferramentas necessárias para a execução dos serviços;</span></div>
                <div className="flex items-start gap-2"><span className="font-black text-slate-900">✓</span><span>Cumprir o cronograma previamente estabelecido, salvo imprevistos de força maior;</span></div>
                <div className="flex items-start gap-2"><span className="font-black text-slate-900">✓</span><span>Manter o local de trabalho organizado e realizar a limpeza básica ao final de cada jornada;</span></div>
                <div className="flex items-start gap-2"><span className="font-black text-slate-900">✓</span><span>Zelar pelos materiais fornecidos pelo cliente, evitando desperdícios e danos;</span></div>
              </div>
            </div>

            {/* Rodapé da Página 1 */}
            <div className="border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500 font-semibold tracking-wide">
              <div>RUA BENJAMIN CONSTANT, 641</div>
              <div>ESCOLA AGRICOLA – BLUMENAU/SC</div>
              <div>(47) 99138-7244</div>
            </div>
          </div>
        )}

        {/* PÁGINA 2 */}
        {(currentPage === 2 || currentPage === 0) && (
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 p-10 max-w-3xl mx-auto text-slate-900 text-[13px] leading-relaxed relative flex flex-col justify-between min-h-[920px]">
            <div>
              <div className="mb-4">
                <EdificaOfficialLogo />
              </div>

              <div className="font-extrabold text-xs uppercase text-slate-900 mt-2 mb-2">5. VALORES</div>
              <div className="flex items-start gap-2 text-xs text-slate-700 mb-3 pl-1">
                <span className="font-black text-slate-900">✓</span>
                <span>Os valores abaixo contemplam mão de obra especializada e insumos para execução dos trabalhos citados acima.</span>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-5 space-y-1.5 text-xs">
                {itensAtivos.length === 0 && (
                  <div className="py-4 text-center text-slate-500 font-medium bg-amber-50 rounded-lg border border-amber-200 text-amber-700">
                    Nenhum serviço com quantidade maior que zero para exibir.
                    <br/><span className="text-[10px]">Itens com quantidade zerada não são impressos no PDF.</span>
                  </div>
                )}
                {itensAtivos.map((it, idx) => {
                  const bdi = margemBdiPercentual || 0;
                  const imp = impostosPercentual || 0;
                  const fatorAcrescimo = 1 + ((bdi + imp) / 100);
                  const sub = it.preco_unitario * it.quantidade * (1 - (it.desconto_percentual || 0) / 100) * fatorAcrescimo;
                  const unitFinal = it.preco_unitario * (1 - (it.desconto_percentual || 0) / 100) * fatorAcrescimo;
                  
                  return (
                    <div key={idx} className="py-1 border-b border-slate-200/60 last:border-0">
                      <div className="flex justify-between">
                        <span className="text-slate-800">{it.servico_nome} {it.quantidade > 1 ? `(${it.quantidade} un)` : ''}</span>
                        <span className="font-bold text-slate-900">{formatCurrency(sub)}</span>
                      </div>
                      {modoVisualizacao === 'detalhado' && (
                        <div className="pl-3 mt-1 mb-1 text-[10px] text-slate-500 font-medium">
                          <div><span className="font-semibold text-slate-700">Valor Unitário:</span> {formatCurrency(unitFinal)}</div>
                          {it.mao_de_obra > 0 && (
                            <div><span className="font-semibold text-slate-700">Mão de Obra:</span> {formatCurrency(it.mao_de_obra)}</div>
                          )}
                          {it.materiais && it.materiais.length > 0 && (
                            <div className="mt-0.5 leading-tight">
                              <span className="font-semibold text-slate-700">Materiais Inclusos:</span> {it.materiais.map(m => m.material_nome || m.nome).join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="pt-2 border-t-2 border-slate-300 flex justify-between items-baseline font-black text-sm text-[#0e2744]">
                  <span>VALOR TOTAL:</span>
                  <span className="text-base text-emerald-700">{formatCurrency(valorTotal)}</span>
                </div>
              </div>

              <div className="font-extrabold text-xs uppercase text-slate-900 mb-2">6. OBSERVAÇÕES</div>
              <div className="space-y-1.5 text-xs text-slate-700 mb-5 pl-1">
                <div className="flex items-start gap-2"><span className="font-black text-slate-900">✓</span><span>O valor informado já inclui mão de obra, encargos, alimentação da equipe, deslocamento e impostos, não havendo custos adicionais ao cliente além do escopo contratado acima.</span></div>
                <div className="flex items-start gap-2"><span className="font-black text-slate-900">✓</span><span>Caso haja alteração da área a proposta será refeita.</span></div>
                <div className="flex items-start gap-2"><span className="font-black text-slate-900">✓</span><span>Serviços realizados conforme normas de segurança.</span></div>
                {observacoesCustom && (
                  <div className="flex items-start gap-2"><span className="font-black text-slate-900">✓</span><span>{observacoesCustom}</span></div>
                )}
              </div>

              <div className="font-extrabold text-xs uppercase text-slate-900 mb-1">7. CONDIÇÕES DE PAGAMENTO</div>
              <p className="text-xs text-slate-700 mb-2">O pagamento pelos serviços será realizado da seguinte forma:</p>
              <div className="space-y-1.5 text-xs text-slate-700 mb-5 pl-1">
                {condicoesPagamentoCustom ? (
                  <div className="flex items-start gap-2"><span className="font-black text-slate-900">✓</span><span>{condicoesPagamentoCustom}</span></div>
                ) : (
                  <>
                    <div className="flex items-start gap-2"><span className="font-black text-slate-900">✓</span><span><strong>50% (cinquenta por cento)</strong> do valor total na assinatura da proposta/contrato, a título de entrada, para mobilização de equipe, compra de insumos e início dos serviços;</span></div>
                    <div className="flex items-start gap-2"><span className="font-black text-slate-900">✓</span><span><strong>50% (cinquenta por cento)</strong> restantes na conclusão dos serviços, mediante aprovação do contratante.</span></div>
                  </>
                )}
              </div>

              <div className="font-extrabold text-xs uppercase text-slate-900 mb-2">8. DADOS BANCÁRIOS</div>
              <div className="bg-slate-50 border-l-4 border-[#0e2744] p-3 text-xs text-slate-800 space-y-0.5 rounded-r-lg mb-5 font-mono">
                <div>Conta Banco 336 – C6</div>
                <div>Agência: 0001</div>
                <div>Conta Corrente: 40058820-0</div>
                <div className="font-bold text-slate-950">Pix CNPJ: 62.829.765/0001-96</div>
              </div>

              <div className="font-extrabold text-xs uppercase text-slate-900 mb-1">9. DOS PRAZOS PARA REALIZAÇÃO</div>
              <div className="flex items-start gap-2 text-xs text-slate-700 pl-1">
                <span className="font-black text-slate-900">✓</span>
                <span><strong>{prazoDias} dias úteis</strong> da assinatura da proposta/Contrato</span>
              </div>
            </div>

            {/* Rodapé da Página 2 */}
            <div className="border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500 font-semibold tracking-wide">
              <div>RUA BENJAMIN CONSTANT, 641</div>
              <div>ESCOLA AGRICOLA – BLUMENAU/SC</div>
              <div>(47) 99138-7244</div>
            </div>
          </div>
        )}

        {/* PÁGINA 3 */}
        {(currentPage === 3 || currentPage === 0) && (
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 p-10 max-w-3xl mx-auto text-slate-900 text-[13px] leading-relaxed relative flex flex-col justify-between min-h-[920px]">
            <div>
              <div className="mb-4">
                <EdificaOfficialLogo />
              </div>

              <div className="font-extrabold text-xs uppercase text-slate-900 mt-2 mb-2">10. GARANTIAS</div>
              <p className="text-xs text-slate-700 text-justify mb-5 leading-relaxed">
                A <strong>Edifica Soluções em Obras Ltda.</strong> responsabiliza-se pela qualidade, eficiência e perfeito funcionamento do serviço executado, garantindo-o pelo prazo de <strong>{prazoGarantia}</strong>, desde que utilizado adequadamente, ou seja, sem danos causados por uso inadequado ou intervenções de terceiros na área tratada.
              </p>

              <div className="font-extrabold text-xs uppercase text-slate-900 mb-2">11. VALIDADE</div>
              <p className="text-xs text-slate-700 mb-1">Esta proposta é válida para <strong>{validadeDias} dias corridos</strong>.</p>
              <p className="text-xs text-slate-700 mb-8">Agradecendo a atenção e permanecendo no aguardo de vossa manifestação, firmamo-nos.</p>

              <p className="text-xs font-semibold text-slate-800 mb-12">Atenciosamente,</p>

              {/* Assinatura da Contratada */}
              <div className="mb-14">
                <div className="w-72 border-b border-slate-800 mb-2"></div>
                <p className="font-extrabold text-xs text-slate-900 uppercase">EDIFICA SOLUÇÕES EM OBRAS LTDA</p>
                <p className="text-xs text-slate-600">Márcio Gil Paycorich</p>
              </div>

              {/* Assinatura do Cliente */}
              <div>
                <p className="text-xs text-slate-800 mb-2">
                  De acordo: ____________________________________________________________________
                </p>
                <p className="font-extrabold text-xs text-slate-900 uppercase ml-20">
                  {(clienteNome || 'NOME DO CLIENTE').toUpperCase()}
                </p>
              </div>
            </div>

            {/* Rodapé da Página 3 */}
            <div className="border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500 font-semibold tracking-wide">
              <div>RUA BENJAMIN CONSTANT, 641</div>
              <div>ESCOLA AGRICOLA – BLUMENAU/SC</div>
              <div>(47) 99138-7244</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
