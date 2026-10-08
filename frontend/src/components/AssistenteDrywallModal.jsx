import React, { useState, useEffect } from 'react';
import { X, Calculator, Settings, Check, Building, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function AssistenteDrywallModal({ onClose, onAddInsumos, materiaisCatalog }) {
  const [modo, setModo] = useState('rapido');
  const [area, setArea] = useState('');
  const [comprimento, setComprimento] = useState('');
  const [peDireito, setPeDireito] = useState('2.70');
  const [nVaos, setNVaos] = useState('0');
  const [nQuinas, setNQuinas] = useState('0');
  
  const [modulacao, setModulacao] = useState('600');
  const [formatoPlaca, setFormatoPlaca] = useState('1.20 x 1.80');
  const [tipoPlaca, setTipoPlaca] = useState('ST');
  const [perda, setPerda] = useState('10');
  const [fornecedorGlobal, setFornecedorGlobal] = useState('Edifica');
  
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      calcular();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [modo, area, comprimento, peDireito, nVaos, nQuinas, modulacao, formatoPlaca, tipoPlaca, perda]);

  const calcular = async () => {
    let areaFinal = modo === 'rapido' ? Number(area) : (Number(comprimento) * Number(peDireito));
    if (!areaFinal || areaFinal <= 0) {
      setResultados([]);
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        modo: modo,
        area_m2: areaFinal,
        comprimento_m: Number(comprimento) || 0,
        pe_direito_m: Number(peDireito) || 2.70,
        n_vaos: Number(nVaos) || 0,
        n_quinas_t: Number(nQuinas) || 0,
        modulacao_mm: Number(modulacao),
        formato_placa: formatoPlaca,
        tipo_placa: tipoPlaca,
        perda_percentual: Number(perda) || 0
      };
      
      const res = await api.post('/materiais/assistentes/drywall/calcular', payload);
      // Aplicar fornecedor global aos resultados
      const dados = res.data.map(item => ({
        ...item,
        fornecido_por: fornecedorGlobal,
        preco_unitario: item.preco_unitario || 0, // Inicia editável
      }));
      setResultados(dados);
    } catch (err) {
      console.error('Erro ao calcular assistente', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setResultados(prev => prev.map(r => ({ ...r, fornecido_por: fornecedorGlobal })));
  }, [fornecedorGlobal]);

  const handleUpdateItem = (idx, field, value) => {
    setResultados(prev => {
      const novos = [...prev];
      novos[idx][field] = value;
      return novos;
    });
  };
  
  const vincularMaterial = async (idx, materialId) => {
    const item = resultados[idx];
    if (!materialId) return;
    try {
      // Find the material in catalog
      const mat = materiaisCatalog.find(m => m.id === materialId);
      if (mat) {
        // Envia para o backend para salvar vínculo (simplificado com fator 1 por padrão se for novo vínculo)
        await api.put(`/materiais/assistentes/insumos/${item.papel}`, {
          material_id: materialId
        });
        // Atualiza a linha
        const novos = [...resultados];
        novos[idx].sem_vinculo = false;
        novos[idx].material_id = mat.id;
        novos[idx].descricao = mat.nome;
        novos[idx].unidade = mat.unidade;
        novos[idx].preco_unitario = mat.preco_medio;
        setResultados(novos);
      }
    } catch (err) {
      alert("Erro ao vincular material");
    }
  };

  const handleAdd = () => {
    const flatten = [];
    resultados.forEach(r => {
      if (r.embalagens_recomendadas && r.embalagens_recomendadas.length > 0) {
        r.embalagens_recomendadas.forEach(emb => {
          flatten.push({
            ...r,
            descricao: `${r.descricao} - ${emb.nome}`,
            quantidade: emb.quantidade,
            preco_unitario: emb.preco,
            unidade: emb.unidade_compra,
            embalagem_id: emb.id,
            origem_assistente: true,
          });
        });
      } else {
        flatten.push({
          ...r,
          quantidade: r.qtd_compra,
          origem_assistente: true,
        });
      }
    });
    const validFlatten = flatten.filter(item => item.quantidade > 0);
    onAddInsumos(validFlatten);
  };

  const hasUnlinked = resultados.some(r => r.sem_vinculo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0b1727] w-[98%] max-w-[1500px] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-2 text-blue-400">
            <Calculator className="w-5 h-5" />
            <h3 className="font-bold">Assistente de Drywall</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 flex flex-col md:flex-row gap-6">
          {/* Formulário */}
          <div className="w-full md:w-80 flex-shrink-0 space-y-4">
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
                      <input type="number" value={peDireito} onChange={e => setPeDireito(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" placeholder="Ex: 2.70" />
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
                <div className="col-span-2">
                  <label className="block text-[10px] text-slate-400 mb-1 uppercase">Formato</label>
                  <select value={formatoPlaca} onChange={e => setFormatoPlaca(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white">
                    <option value="1.20 x 2.40">1.20 x 2.40</option>
                    <option value="1.20 x 1.80">1.20 x 1.80</option>
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
          <div className="flex-1 min-w-0 flex flex-col">
            <h4 className="text-sm font-semibold text-white mb-3">Insumos Gerados</h4>
            
            {resultados.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-700 rounded-xl bg-slate-800/10 p-6 min-h-[300px]">
                <Calculator className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Preencha as medidas para calcular os insumos.</p>
              </div>
            ) : loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-700 rounded-xl bg-slate-800/10 p-6 min-h-[300px]">
                <p className="text-sm">Calculando...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1">
                <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 overflow-hidden shadow-inner">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800/50 text-[10px] uppercase text-slate-400 border-b border-slate-700/50">
                        <th className="px-4 py-3 font-semibold">Material</th>
                        <th className="px-4 py-3 font-semibold text-center w-32" title="Quantidade líquida (uso)">Qtd Líq.</th>
                        <th className="px-4 py-3 font-semibold text-center w-36" title="Quantidade para compra">Compra</th>
                        <th className="px-4 py-3 font-semibold w-32 text-center">R$ Unit.</th>

                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {resultados.map((r, i) => (
                        <tr key={i} className={`border-b border-slate-800/50 ${r.sem_vinculo ? 'bg-red-500/10' : 'hover:bg-slate-800/30'}`}>
                          <td className="px-3 py-2.5">
                            <div className="text-white font-medium">{r.descricao}</div>
                            {r.sem_vinculo && (
                              <div className="mt-1 flex gap-2 items-center">
                                <span className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Sem insumo vinculado</span>
                                <select 
                                  className="bg-slate-800 border border-slate-700 rounded px-1 py-0.5 text-[10px]"
                                  onChange={e => vincularMaterial(i, e.target.value)}
                                  defaultValue=""
                                >
                                  <option value="" disabled>Vincular a...</option>
                                  {materiaisCatalog.map(m => (
                                    <option key={m.id} value={m.id}>{m.nome} ({m.unidade})</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="text-slate-300">{r.qtd_liquida_uso.toFixed(2)}</span> <span className="text-slate-500 text-[10px]">{r.unidade_uso}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="font-bold text-emerald-400">{r.qtd_compra}</span> <span className="text-slate-500 text-[10px]">{r.unidade || r.unidade_uso}</span>
                            {r.embalagens_recomendadas && r.embalagens_recomendadas.length > 0 && (
                              <div className="text-[9px] text-slate-400 mt-1 leading-tight text-center">
                                {r.embalagens_recomendadas.map(e => `${e.quantidade}x ${e.nome}`).join(' + ')}
                                {r.sobra_unidades > 0 && ` (Sobra ${r.sobra_unidades.toFixed(1)})`}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="number"
                              step="0.01"
                              value={r.preco_unitario}
                              onChange={(e) => handleUpdateItem(i, 'preco_unitario', parseFloat(e.target.value) || 0)}
                              className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                              disabled={r.sem_vinculo}
                            />
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
            disabled={resultados.length === 0 || hasUnlinked || loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Check className="w-4 h-4" /> Adicionar Insumos ao Orçamento
          </button>
        </div>
      </div>
    </div>
  );
}
