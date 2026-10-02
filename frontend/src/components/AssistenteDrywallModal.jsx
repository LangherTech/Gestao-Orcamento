import React, { useState, useEffect } from 'react';
import { X, Calculator, Settings, Check, Building } from 'lucide-react';

export default function AssistenteDrywallModal({ onClose, onAddInsumos, materiaisCatalog }) {
  const [modo, setModo] = useState('rapido'); // rapido ou exato
  
  // Rápido
  const [area, setArea] = useState('');
  
  // Exato
  const [comprimento, setComprimento] = useState('');
  const [peDireito, setPeDireito] = useState('');
  const [nVaos, setNVaos] = useState('0');
  const [nQuinas, setNQuinas] = useState('0');
  
  // Comum
  const [modulacao, setModulacao] = useState('600');
  const [formatoPlaca, setFormatoPlaca] = useState('1200x2400');
  const [tipoPlaca, setTipoPlaca] = useState('ST');
  const [perda, setPerda] = useState('10');
  
  // Resultado
  const [resultados, setResultados] = useState([]);

  useEffect(() => {
    calcular();
  }, [modo, area, comprimento, peDireito, nVaos, nQuinas, modulacao, formatoPlaca, tipoPlaca, perda]);

  const calcular = () => {
    let areaFinal = 0;
    let mLinearGuias = 0;
    let mLinearMontantes = 0;
    
    if (modo === 'rapido') {
      areaFinal = Number(area) || 0;
      mLinearGuias = areaFinal * 0.7; // aproximado
      mLinearMontantes = areaFinal * (modulacao === '600' ? 1.8 : 2.5); // aproximado
    } else {
      const comp = Number(comprimento) || 0;
      const pd = Number(peDireito) || 0;
      const vaos = Number(nVaos) || 0;
      const quinas = Number(nQuinas) || 0;
      
      areaFinal = comp * pd;
      
      // Cálculo exato aproximado para montantes
      // 1 montante a cada modulacao
      const espacamento = modulacao === '600' ? 0.6 : 0.4;
      const montantesBase = Math.ceil(comp / espacamento) + 1;
      
      // Vãos e quinas adicionam montantes
      const montantesExtras = (vaos * 2) + (quinas * 1);
      
      mLinearMontantes = (montantesBase + montantesExtras) * pd;
      mLinearGuias = comp * 2; // teto e chão
    }
    
    if (areaFinal === 0) {
      setResultados([]);
      return;
    }

    const multPerda = 1 + (Number(perda) || 0) / 100;
    
    const placaM2 = areaFinal * 2; // Parede simples 2 faces
    const qtdPlacas = (placaM2 * multPerda) / (formatoPlaca === '1200x2400' ? 2.88 : 2.16);
    
    const res = [
      {
        papel: `Placa de Gesso ${tipoPlaca} ${formatoPlaca}`,
        qtd: Math.ceil(qtdPlacas),
        unidade: 'un',
        precoBase: tipoPlaca === 'ST' ? 35 : (tipoPlaca === 'RU' ? 45 : 50),
        fornecidoPor: 'Edifica'
      },
      {
        papel: 'Montante 70mm',
        qtd: Math.ceil((mLinearMontantes * multPerda) / 3), // barras de 3m
        unidade: 'un',
        precoBase: 15,
        fornecidoPor: 'Edifica'
      },
      {
        papel: 'Guia 70mm',
        qtd: Math.ceil((mLinearGuias * multPerda) / 3), // barras de 3m
        unidade: 'un',
        precoBase: 12,
        fornecidoPor: 'Edifica'
      },
      {
        papel: 'Parafuso TA25',
        qtd: Math.ceil((areaFinal * 30 * multPerda) / 1000) * 1000, // Caixa com 1000
        unidade: 'cx',
        precoBase: 30,
        fornecidoPor: 'Edifica'
      },
      {
        papel: 'Parafuso TR13',
        qtd: Math.ceil((areaFinal * 15 * multPerda) / 1000) * 1000, // Caixa com 1000
        unidade: 'cx',
        precoBase: 25,
        fornecidoPor: 'Edifica'
      },
      {
        papel: 'Fita Telada/Papel',
        qtd: Math.ceil((areaFinal * 3 * multPerda) / 90), // Rolo de 90m
        unidade: 'rl',
        precoBase: 20,
        fornecidoPor: 'Edifica'
      },
      {
        papel: 'Massa para Drywall',
        qtd: Math.ceil((areaFinal * 0.3 * multPerda) / 5), // Balde de 5kg
        unidade: 'bd',
        precoBase: 40,
        fornecidoPor: 'Edifica'
      }
    ];

    setResultados(res);
  };

  const handleToggleFornecedor = (idx) => {
    const novos = [...resultados];
    novos[idx].fornecidoPor = novos[idx].fornecidoPor === 'Edifica' ? 'Cliente' : 'Edifica';
    setResultados(novos);
  };

  const handleAdd = () => {
    onAddInsumos(resultados);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0b1727] w-full max-w-4xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-2 text-blue-400">
            <Calculator className="w-5 h-5" />
            <h3 className="font-bold">Assistente de Drywall (W111 Parede Simples)</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col md:flex-row gap-6">
          {/* Formulário */}
          <div className="w-full md:w-1/3 space-y-4">
            <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/50">
              <label className="block text-xs text-slate-400 font-semibold mb-2">Modo de Cálculo</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setModo('rapido')}
                  className={`flex-1 py-1.5 text-xs rounded-lg font-medium border transition-colors ${modo === 'rapido' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                >Rápido</button>
                <button 
                  onClick={() => setModo('exato')}
                  className={`flex-1 py-1.5 text-xs rounded-lg font-medium border transition-colors ${modo === 'exato' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                >Exato</button>
              </div>
            </div>

            <div className="space-y-3">
              {modo === 'rapido' ? (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Área Total (m²)</label>
                  <input type="number" value={area} onChange={e => setArea(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="Ex: 50" />
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-400 mb-1">Comprimento (m)</label>
                      <input type="number" value={comprimento} onChange={e => setComprimento(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="Ex: 10" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-slate-400 mb-1">Pé-direito (m)</label>
                      <input type="number" value={peDireito} onChange={e => setPeDireito(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="Ex: 2.8" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-400 mb-1">Nº Vãos (Portas)</label>
                      <input type="number" value={nVaos} onChange={e => setNVaos(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-slate-400 mb-1">Nº Quinas</label>
                      <input type="number" value={nQuinas} onChange={e => setNQuinas(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-700/50 space-y-3 mt-4">
              <div className="flex items-center gap-2 text-slate-300 font-medium text-xs mb-2">
                <Settings className="w-4 h-4" /> Parâmetros
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase">Modulação</label>
                  <select value={modulacao} onChange={e => setModulacao(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white">
                    <option value="600">600 mm</option>
                    <option value="400">400 mm</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase">Placa</label>
                  <select value={tipoPlaca} onChange={e => setTipoPlaca(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white">
                    <option value="ST">ST (Standard)</option>
                    <option value="RU">RU (Umidade)</option>
                    <option value="RF">RF (Fogo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase">Formato</label>
                  <select value={formatoPlaca} onChange={e => setFormatoPlaca(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white">
                    <option value="1200x2400">1200x2400</option>
                    <option value="1200x1800">1200x1800</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase">Perda (%)</label>
                  <input type="number" value={perda} onChange={e => setPerda(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" />
                </div>
              </div>
            </div>

          </div>

          {/* Resultados */}
          <div className="w-full md:w-2/3 flex flex-col">
            <h4 className="text-sm font-semibold text-white mb-3">Insumos Gerados</h4>
            
            {resultados.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-700 rounded-xl bg-slate-800/10 p-6">
                <Calculator className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Preencha as medidas para calcular os insumos.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800/50 text-[10px] uppercase text-slate-400 border-b border-slate-700/50">
                        <th className="px-3 py-2 font-semibold">Material</th>
                        <th className="px-3 py-2 font-semibold w-24 text-center">Qtd Compra</th>
                        <th className="px-3 py-2 font-semibold w-32 text-center">Fornecimento</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {resultados.map((r, i) => (
                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="px-3 py-2.5 text-white font-medium">{r.papel}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="font-bold text-emerald-400">{r.qtd}</span> <span className="text-slate-500 text-[10px]">{r.unidade}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <button
                              onClick={() => handleToggleFornecedor(i)}
                              className={`w-full py-1 text-[10px] font-bold rounded flex items-center justify-center gap-1 transition-all ${
                                r.fornecidoPor === 'Edifica' 
                                  ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
                                  : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                              }`}
                            >
                              {r.fornecidoPor === 'Edifica' ? <Building className="w-3 h-3" /> : null}
                              {r.fornecidoPor}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800">Cancelar</button>
          <button 
            onClick={handleAdd}
            disabled={resultados.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Check className="w-4 h-4" /> Adicionar Insumos ao Orçamento
          </button>
        </div>
      </div>
    </div>
  );
}
