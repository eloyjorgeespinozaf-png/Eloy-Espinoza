/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Modal de Registro de Nuevo Expediente // Lucha Contra el Contrabando (PII-LCC)
 */

import React, { useState } from 'react';
import { G2RegistryRecord } from '../../types';
import { X, Plus, Shield } from 'lucide-react';

interface NewG2RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRecord: (record: G2RegistryRecord) => void;
}

export const NewG2RecordModal: React.FC<NewG2RecordModalProps> = ({
  isOpen,
  onClose,
  onAddRecord
}) => {
  const [tipoRegistro, setTipoRegistro] = useState<'GRAFICO' | 'LITERAL' | 'NUMERICO' | 'AUDIO'>('LITERAL');
  const [componenteRubro, setComponenteRubro] = useState<'OTRO' | 'POLITICO' | 'ECONOMICO' | 'MILITAR' | 'PSICOSOCIAL'>('ECONOMICO');
  const [clasificacionSeguridad, setClasificacionSeguridad] = useState<'CONFIDENCIAL' | 'SECRETO' | 'RESERVADO'>('CONFIDENCIAL');
  const [contenidoDetallado, setContenidoDetallado] = useState('');
  const [coordenadas, setCoordenadas] = useState('MGRS 19K DQ 4521 8932');
  const [unidadReceptora, setUnidadReceptora] = useState('Puesto de Comando Central CEO-LCC');
  const [operadorRegistro, setOperadorRegistro] = useState('Cap. M. Vargas (Analista LCC)');
  const [confiabilidad, setConfiabilidad] = useState('A');
  const [exactitud, setExactitud] = useState('1');
  const [ideasFuerzaText, setIdeasFuerzaText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contenidoDetallado.trim()) return;

    const newId = `REG-2026-${String(Math.floor(10 + Math.random() * 90)).padStart(3, '0')}`;
    const ideasList = ideasFuerzaText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const newRecord: G2RegistryRecord = {
      id: newId,
      fechaHoraIngreso: new Date().toISOString().slice(0, 16),
      tipoRegistro,
      componenteRubro,
      clasificacionSeguridad,
      contenidoDetallado,
      referenciasAntecedentes: ['PARTE PII-LCC', 'OPERACIONES CEO-LCC'],
      unidadReceptora,
      operadorRegistro,
      observacionesAdicionales: 'REGISTRO DIRECTO DESDE TALLER DE FUSIÓN LCC',
      especificoGrafico: tipoRegistro === 'GRAFICO' ? {
        subtipoElemento: 'Carta de Situación y Pasos Clandestinos',
        ubicacionReferenciaDigital: 'Soporte PII-LCC / CEO-LCC',
        escalaCoordenadas: `1:50.000 / ${coordenadas}`,
        fechaCapturaGrafica: new Date().toISOString().slice(0, 10),
        interpretacionVisualPreliminar: contenidoDetallado.slice(0, 150),
        tipoSoporte: 'Carta Topográfica / Situación Táctica',
        identificadorHojaPliego: `PLIEGO-${newId}`,
        escala: '1:50.000',
        coordenadasCuadricula: coordenadas,
        metadatosSensorFecha: new Date().toISOString().slice(0, 10),
        orientacionNorte: 'Norte Cuadrícula (NC)'
      } : undefined,
      especificoLiteral: tipoRegistro === 'LITERAL' ? {
        subtipoSoporte: 'Informe Táctico de Interdicción',
        extractoPalabrasClave: 'LUCHA CONTRA EL CONTRABANDO / PII-LCC',
        canalTransmision: 'Canal Operativo Seguro CEO-LCC',
        documentoOrigenReferencia: 'PARTE OPERATIVO LCC'
      } : undefined,
      estadoRegistro: 'Evaluado',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      calificacionEvaluacion: `${confiabilidad}-${exactitud}`,
      evaluacion: {
        pertinencia: {
          componenteDestino: componenteRubro,
          nivelUrgencia: 'Prioritaria'
        },
        confiabilidad: {
          escala: confiabilidad,
          evaluarPorSeparado: true,
          evaluacionFuente: confiabilidad,
          evaluacionMedio: confiabilidad
        },
        exactitud: {
          escala: exactitud
        },
        codigoAlfanumerico: `${confiabilidad}-${exactitud}`,
        analistaEvaluador: operadorRegistro,
        fechaHoraEvaluacion: new Date().toISOString().slice(0, 16),
        observacionesEvaluacion: `Evaluado bajo estándares PII-LCC: Código ${confiabilidad}-${exactitud}`,
        ideasFuerza: ideasList.length > 0 ? ideasList : [
          contenidoDetallado.slice(0, 100)
        ]
      }
    };

    onAddRecord(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b0f19] border border-[#222c40] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative text-left">
        <div className="flex items-center justify-between border-b border-[#1e2738] pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#f97316]" />
            <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
              Ingreso de Expediente // Lucha Contra el Contrabando (LCC)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[#94a3b8] mb-1 font-bold">Tipo de Registro</label>
              <select
                value={tipoRegistro}
                onChange={(e) => setTipoRegistro(e.target.value as any)}
                className="w-full bg-[#121826] border border-[#222c40] rounded px-3 py-2 text-white focus:outline-none focus:border-[#f97316]"
              >
                <option value="LITERAL">LITERAL (Informe Táctico / Parte)</option>
                <option value="GRAFICO">GRÁFICO (Carta Topográfica / Sensor FLIR)</option>
                <option value="NUMERICO">NUMÉRICO (Telemetría / Cifras de Comiso)</option>
                <option value="AUDIO">AUDIO (Comunicaciones Radiales)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#94a3b8] mb-1 font-bold">Rubro / Componente</label>
              <select
                value={componenteRubro}
                onChange={(e) => setComponenteRubro(e.target.value as any)}
                className="w-full bg-[#121826] border border-[#222c40] rounded px-3 py-2 text-white focus:outline-none focus:border-[#f97316]"
              >
                <option value="ECONOMICO">ECONÓMICO (Mercaderías / Divisas)</option>
                <option value="MILITAR">MILITAR (Operaciones de Interdicción)</option>
                <option value="POLITICO">POLÍTICO (Marco Jurídico / Ley 1053)</option>
                <option value="PSICOSOCIAL">PSICOSOCIAL (Comunidades / Cobertura)</option>
                <option value="OTRO">OTRO (Interagencial / Aduana)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#94a3b8] mb-1 font-bold">Clasificación</label>
              <select
                value={clasificacionSeguridad}
                onChange={(e) => setClasificacionSeguridad(e.target.value as any)}
                className="w-full bg-[#121826] border border-[#222c40] rounded px-3 py-2 text-white focus:outline-none focus:border-[#f97316]"
              >
                <option value="CONFIDENCIAL">CONFIDENCIAL</option>
                <option value="SECRETO">SECRETO</option>
                <option value="RESERVADO">RESERVADO</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#94a3b8] mb-1 font-bold">Contenido Detallado de la Operación o Interdicción *</label>
            <textarea
              rows={4}
              required
              value={contenidoDetallado}
              onChange={(e) => setContenidoDetallado(e.target.value)}
              placeholder="Describa la caravana clandestina, comiso de mercadería, cisternas de combustible, vehículos indocumentados, zanjas o pasos no habilitados..."
              className="w-full bg-[#121826] border border-[#222c40] rounded p-3 text-white focus:outline-none focus:border-[#f97316] font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#94a3b8] mb-1 font-bold">Coordenadas Cuadrícula MGRS</label>
              <input
                type="text"
                value={coordenadas}
                onChange={(e) => setCoordenadas(e.target.value)}
                className="w-full bg-[#121826] border border-[#222c40] rounded px-3 py-2 text-white focus:outline-none focus:border-[#f97316]"
              >
              </input>
            </div>
            <div>
              <label className="block text-[#94a3b8] mb-1 font-bold">Analista Evaluador LCC</label>
              <input
                type="text"
                value={operadorRegistro}
                onChange={(e) => setOperadorRegistro(e.target.value)}
                className="w-full bg-[#121826] border border-[#222c40] rounded px-3 py-2 text-white focus:outline-none focus:border-[#f97316]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-[#121826] border border-[#222c40] rounded">
            <div>
              <label className="block text-[#f97316] mb-1 font-bold">Confiabilidad Fuente (A-D)</label>
              <select
                value={confiabilidad}
                onChange={(e) => setConfiabilidad(e.target.value)}
                className="w-full bg-[#0b0f19] border border-[#334155] rounded px-2 py-1.5 text-white"
              >
                <option value="A">A - Completamente Confiable</option>
                <option value="B">B - Usualmente Confiable</option>
                <option value="C">C - Bastante Confiable</option>
                <option value="D">D - No Confiable</option>
              </select>
            </div>
            <div>
              <label className="block text-[#f97316] mb-1 font-bold">Exactitud Información (1-4)</label>
              <select
                value={exactitud}
                onChange={(e) => setExactitud(e.target.value)}
                className="w-full bg-[#0b0f19] border border-[#334155] rounded px-2 py-1.5 text-white"
              >
                <option value="1">1 - Confirmada por otras fuentes</option>
                <option value="2">2 - Probable / Coincidente</option>
                <option value="3">3 - Posible / No confirmada</option>
                <option value="4">4 - Dudosa / Improbable</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#94a3b8] mb-1 font-bold">Ideas Fuerza Extraídas (una por línea)</label>
            <textarea
              rows={3}
              value={ideasFuerzaText}
              onChange={(e) => setIdeasFuerzaText(e.target.value)}
              placeholder="Caravana de camiones detectada en Salar de Coipasa...&#10;Inutilización de paso clandestino en Hito 18..."
              className="w-full bg-[#121826] border border-[#222c40] rounded p-3 text-white focus:outline-none focus:border-[#f97316]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#1e2738]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1a2233] text-[#94a3b8] hover:text-white rounded transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold rounded flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Expediente en PII-LCC</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
