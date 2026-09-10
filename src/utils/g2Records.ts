/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Expedientes de Inteligencia y Operaciones de Lucha Contra el Contrabando (PII-LCC / CEO-LCC)
 */

import { G2RegistryRecord } from '../types';

export const initialG2Records: G2RegistryRecord[] = [
  {
    id: "REG-2026-001",
    fechaHoraIngreso: "2026-08-20T21:15",
    tipoRegistro: "GRAFICO",
    componenteRubro: "MILITAR",
    clasificacionSeguridad: "CONFIDENCIAL",
    contenidoDetallado: "DOCTRINA Y MARCO LEGAL: LEY 1053 DE FORTALECIMIENTO DE LA LUCHA CONTRA EL CONTRABANDO // ART. 251 CPE.\n\nEsquema rector de competencias e interoperabilidad interagencial para el Comando Estratégico Operacional de Lucha Contra el Contrabando (CEO-LCC), Fuerzas Armadas, Policía Boliviana y Aduana Nacional.\n\nFundamentos Operacionales en Zona de Seguridad Fronteriza (50 km):\n• Rango Legal y Atribuciones: La Ley 1053 y Decreto Reglamentario facultan el uso proporcional de la fuerza en defensa propia y de terceros frente a emboscadas armadas de contrabandistas.\n• Mandato de Comiso Inmediato: Potestad legal de interceptar e incautar medios de transporte, camiones indocumentados y mercancías ilícitas dentro del radio de seguridad fronteriza.\n• Inutilización de Pasos Ilegales: Habilitación de zanjas antivehículo y voladura controlada de accesos clandestinos acondicionados por clanes de contrabandistas en hitos fronterizos.\n• Cadena de Custodia: Traslado obligatorio y resguardo armado de las mercancías comisadas hacia los recintos de la Aduana Nacional (Pastocalle, Pisiga, Tambo Quemado).",
    referenciasAntecedentes: ["LEY 1053 LCC", "CPE ART 251", "DIRECTIVA CEO-LCC 2026"],
    unidadReceptora: "Puesto de Comando Central CEO-LCC",
    operadorRegistro: "Cap. Marcelo Benítez Vargas (Oficial Inteligencia LCC)",
    observacionesAdicionales: "MARCO DOCTRINAL VINCULANTE PARA TODAS LAS PATRULLAS DEL CEO-LCC",
    especificoGrafico: {
      subtipoElemento: "Carta de Situación y Pasos Clandestinos",
      ubicacionReferenciaDigital: "Cartografía CEO-LCC / Sector Occidental Oruro-Potosí",
      archivoAdjunto: {
        nombre: "carta_operacional_lcc_2026.jpg",
        tipo: "image/jpeg",
        tamano: 32400,
        base64Data: "",
        fechaCarga: "2026-08-20T21:36:19.708Z"
      },
      escalaCoordenadas: "1:50.000 / MGRS 19K DQ 4521 8932",
      fechaCapturaGrafica: "2026-08-20",
      interpretacionVisualPreliminar: "Carta de situación con trazado de la línea fronteriza Hito 14 - Hito 18, zanjas de contención y áreas de patrullaje militar del CEO-LCC.",
      tipoSoporte: "Carta Topográfica / Situación Táctica",
      identificadorHojaPliego: "PLIEGO-LCC-DOCOPER-2026",
      escala: "1:50.000",
      coordenadasCuadricula: "MGRS 19K DQ 4521 8932",
      metadatosSensorFecha: "2026-08-20",
      orientacionNorte: "Norte Cuadrícula (NC)"
    },
    estadoRegistro: "Evaluado",
    createdAt: 1787262076177,
    updatedAt: 1787263339172,
    calificacionEvaluacion: "A-1",
    evaluacion: {
      pertinencia: {
        componenteDestino: "MILITAR",
        nivelUrgencia: "Prioritaria"
      },
      confiabilidad: {
        escala: "A",
        evaluarPorSeparado: true,
        evaluacionFuente: "A",
        evaluacionMedio: "A"
      },
      exactitud: {
        escala: "1"
      },
      codigoAlfanumerico: "A-1",
      analistaEvaluador: "Cap. M. Vargas (Analista LCC)",
      fechaHoraEvaluacion: "2026-08-20T22:01",
      observacionesEvaluacion: "DOCUMENTO DOCTRINAL OFICIAL [A-1]: Fuente oficial / Información confirmada por legislación vigente. Base legal para operaciones de interdicción activa.",
      ideasFuerza: [
        "Aplicación estricta de la Ley 1053 de Fortalecimiento de la Lucha Contra el Contrabando.",
        "Potestad de comiso inmediato de mercancías y vehículos en radio de 50 km de frontera.",
        "Uso legítimo y proporcional de la fuerza frente a ataques armados de clanes de contrabandistas.",
        "Inutilización de pasos no habilitados, zanjas y huellas clandestinas en Oruro y Potosí.",
        "Custodia armada y entrega rigurosa a recintos de la Aduana Nacional de Bolivia."
      ]
    }
  },
  {
    id: "REG-2026-002",
    fechaHoraIngreso: "2026-08-20T21:10",
    tipoRegistro: "GRAFICO",
    componenteRubro: "ECONOMICO",
    clasificacionSeguridad: "CONFIDENCIAL",
    contenidoDetallado: "DETECCIÓN Y SEGUIMIENTO AÉREO: CARAVANA DE 6 CAMIONES DE ALTO TONELAJE (CONVOY CLANDESTINO).\n\nSensor electro-óptico FLIR detectó a las 02:30 horas una columna de 6 camiones trailer Volvo F-12 desplazándose a baja velocidad y con luces apagadas sobre huella no habilitada en el Salar de Coipasa con dirección al nodo de acopio de Challapata.\n\nComposición y Modo Operativo del Convoy:\n• 6 camiones de alto tonelaje cargados con línea blanca, electrónica de contrabando, fardos de prendería y cigarrillos sin póliza aduanera.\n• Cobertura con lonas térmicas reflectoras para eludir sensores infrarrojos.\n• 3 camionetas 4x4 sin placas circulando como 'loros' (vigilantes de vanguardia y retaguardia), equipadas con reflectores de alta intensidad y miguelines metálicos con el objetivo de pinchar neumáticos a patrullas militares del CEO-LCC.\n• Valor estimado de la mercancía supera los 2.400.000 USD.",
    referenciasAntecedentes: ["PARTE AÉREO FLIR-04", "ALERTA COIPASA 2026"],
    unidadReceptora: "Puesto de Comando Central CEO-LCC",
    operadorRegistro: "Cap. Marcelo Benítez Vargas (Oficial Inteligencia LCC)",
    observacionesAdicionales: "EVIDENCIA TÉRMICA Y COORDENADAS TRANSMITIDAS AL GRUPO DE TAREA CONJUNTA",
    especificoGrafico: {
      subtipoElemento: "Registro Térmico FLIR / Reconocimiento Aéreo",
      ubicacionReferenciaDigital: "Telemetría Sensor Aéreo / Sector Salar de Coipasa",
      archivoAdjunto: {
        nombre: "flir_convoy_coipasa.jpg",
        tipo: "image/jpeg",
        tamano: 31786,
        base64Data: "",
        fechaCarga: "2026-08-20T21:12:00.000Z"
      },
      escalaCoordenadas: "1:50.000 / MGRS 19K CQ 7812 3491",
      fechaCapturaGrafica: "2026-08-20",
      interpretacionVisualPreliminar: "Caravana de 6 camiones pesados y 3 vehículos de escolta ('loros') en formación lineal sobre huella de salar.",
      tipoSoporte: "Registro Electro-Óptico / Sensor FLIR",
      identificadorHojaPliego: "FLIR-CONVOY-COIPASA-02",
      escala: "1:50.000",
      coordenadasCuadricula: "MGRS 19K CQ 7812 3491",
      metadatosSensorFecha: "2026-08-20",
      orientacionNorte: "Norte Cuadrícula (NC)"
    },
    estadoRegistro: "Evaluado",
    createdAt: 1787260424687,
    updatedAt: 1787263229091,
    calificacionEvaluacion: "A-2",
    evaluacion: {
      pertinencia: {
        componenteDestino: "ECONOMICO",
        nivelUrgencia: "Prioritaria"
      },
      confiabilidad: {
        escala: "A",
        evaluarPorSeparado: true,
        evaluacionFuente: "A",
        evaluacionMedio: "A"
      },
      exactitud: {
        escala: "2"
      },
      codigoAlfanumerico: "A-2",
      analistaEvaluador: "Cap. M. Vargas (Analista LCC)",
      fechaHoraEvaluacion: "2026-08-20T21:59",
      observacionesEvaluacion: "[A-2]: Fuente técnica fidedigna confirmada por sensor aéreo electro-óptico. Caravana activa en tránsito clandestino.",
      ideasFuerza: [
        "Caravana de 6 camiones de alto tonelaje transportando contrabando en Salar de Coipasa.",
        "Uso de lonas térmicas y desplazamiento nocturno a oscuras hacia Challapata.",
        "Vanguardia y retaguardia con 3 camionetas sin placas ('loros') equipadas con miguelines.",
        "Carga valuada en más de 2.4 millones de USD (electrónica, fardos y mercadería de contrabando).",
        "Recomendación: Emboscada de interdicción en cuello de botella antes de ingreso a carretera asfaltada."
      ]
    }
  },
  {
    id: "REG-2026-003",
    fechaHoraIngreso: "2026-08-20T02:44",
    tipoRegistro: "LITERAL",
    componenteRubro: "ECONOMICO",
    clasificacionSeguridad: "CONFIDENCIAL",
    contenidoDetallado: "INTERCEPTACIÓN Y COMISO DE CISTERNAS CON DIÉSEL SUBVENCIONADO DESTINADO AL CONTRABANDO.\n\nPatrulla móvil del CEO-LCC en operativo conjunto con la Agencia Nacional de Hidrocarburos (ANH) interceptó en el tramo Tambo Quemado - Charaña dos camiones cisterna con placas clonadas que transportaban de forma clandestina un total de 45.000 litros de diésel oil subvencionado.\n\nDetalles del Decomiso:\n• Las cisternas contaban con compartimentos modificados ('doble fondo') y válvulas ocultas para descarga rápida en puntos ciegos de la frontera.\n• Se verificó la falsificación de hojas de ruta de sustancias controladas y precintos de seguridad adulterados de YPFB.\n• El destino final proyectado era el abastecimiento de maquinaria pesada vinculada a minería ilegal en territorio limítrofe y su venta con sobreprecio ilícito en el extranjero.\n• Tres conductores y asistentes fueron aprehendidos y puestos a disposición del Ministerio Público por contrabando agravado de hidrocarburos (Ley 100 y Art. 226 Bis CP).",
    referenciasAntecedentes: ["PARTE OPERATIVO ANH-CEO 2026", "INFORME INTERDICCIÓN DIÉSEL"],
    unidadReceptora: "Puesto de Comando Central CEO-LCC",
    operadorRegistro: "Oficial de Guardia LCC",
    observacionesAdicionales: "VEHÍCULOS Y COMBUSTIBLE ENTREGADOS BAJO ACTA A YPFB Y ADUANA NACIONAL",
    especificoLiteral: {
      subtipoSoporte: "Informe Táctico",
      extractoPalabrasClave: "DESVÍO DE COMBUSTIBLE / DIÉSEL SUBVENCIONADO / CISTERNAS CLONADAS",
      canalTransmision: "Red Militar Encriptada CEO-LCC",
      documentoOrigenReferencia: "PARTE OPERATIVO COMB-03"
    },
    estadoRegistro: "Evaluado",
    createdAt: 1787194063102,
    updatedAt: 1787195447405,
    calificacionEvaluacion: "B-1",
    evaluacion: {
      pertinencia: {
        componenteDestino: "ECONOMICO",
        nivelUrgencia: "Prioritaria"
      },
      confiabilidad: {
        escala: "B",
        evaluarPorSeparado: true,
        evaluacionFuente: "B",
        evaluacionMedio: "A"
      },
      exactitud: {
        escala: "1"
      },
      codigoAlfanumerico: "B-1",
      analistaEvaluador: "Cap. M. Vargas (Analista LCC)",
      fechaHoraEvaluacion: "2026-08-20T03:09",
      observacionesEvaluacion: "[B-1]: Reporte verificado en terreno con incautación física de 45.000 litros de diésel y dos cisternas.",
      ideasFuerza: [
        "Comiso de 45.000 litros de diésel subvencionado en sector Tambo Quemado - Charaña.",
        "Uso de cisternas con doble fondo y precintos de seguridad adulterados.",
        "Vínculo directo con redes de contrabando transfronterizo de hidrocarburos.",
        "Aprehensión en flagrancia de 3 integrantes y remisión a la justicia ordinaria.",
        "Alerta prioritaria para intensificar controles móviles sobre rutas de combustible."
      ]
    }
  },
  {
    id: "REG-2026-004",
    fechaHoraIngreso: "2026-08-20T01:42",
    tipoRegistro: "LITERAL",
    componenteRubro: "MILITAR",
    clasificacionSeguridad: "CONFIDENCIAL",
    contenidoDetallado: "OPERATIVO DE INTERDICCIÓN DE VEHÍCULOS INDOCUMENTADOS ('CHUTOS') Y NEUTRALIZACIÓN DE PASO ILEGAL EN HITO 18.\n\nPatrulla de Reacción Rápida del CEO-LCC interceptó en horas de la madrugada un convoy de 5 vehículos indocumentados que ingresaron ilegalmente desde territorio chileno por el sector no habilitado del Hito 18 (Paso Pisiga - Colchane).\n\nResultados Operacionales:\n• 4 vagonetas 4x4 sin documentación comercial ni póliza de importación fueron aseguradas tras una persecución táctica por huellas secundarias.\n• Un quinto vehículo se precipitó a una zanja de contención excavada por el CEO-LCC, quedando inutilizado.\n• Los conductores huyeron a pie hacia el lado fronterizo opuesto favorecidos por la oscuridad y terreno agreste.\n• Ingenieros del Ejército procedieron a la inhabilitación mecánica de 150 metros de huella clandestina utilizada por los contrabandistas mediante maquinaria pesada.",
    referenciasAntecedentes: ["PARTE OPERATIVO HITO 18", "CONTROL PISIGA-COLCHANE"],
    unidadReceptora: "Puesto de Comando Central CEO-LCC",
    operadorRegistro: "Oficial de Guardia LCC",
    observacionesAdicionales: "VEHÍCULOS TRASLADADOS AL RECINTO ADUANERO DE PASTOCALLE (ORURO)",
    especificoLiteral: {
      subtipoSoporte: "Fichero Operativo",
      extractoPalabrasClave: "VEHÍCULOS INDOCUMENTADOS / CHUTOS / HITO 18 PISIGA / ZANJA TÁCTICA",
      canalTransmision: "Canal Táctico VHF CEO-LCC",
      documentoOrigenReferencia: "PARTE REG-HITO-18"
    },
    estadoRegistro: "Evaluado",
    createdAt: 1787190310890,
    updatedAt: 1787195483108,
    calificacionEvaluacion: "A-1",
    evaluacion: {
      pertinencia: {
        componenteDestino: "MILITAR",
        nivelUrgencia: "Prioritaria"
      },
      confiabilidad: {
        escala: "A",
        evaluarPorSeparado: true,
        evaluacionFuente: "A",
        evaluacionMedio: "A"
      },
      exactitud: {
        escala: "1"
      },
      codigoAlfanumerico: "A-1",
      analistaEvaluador: "Cap. M. Vargas (Analista LCC)",
      fechaHoraEvaluacion: "2026-08-20T03:10",
      observacionesEvaluacion: "[A-1]: Incautación física de 4 vehículos y neutralización de paso ilegal confirmada por el comandante de patrulla.",
      ideasFuerza: [
        "Interdicción de 5 vehículos indocumentados ('chutos') en sector de Hito 18 Pisiga.",
        "Efectividad de zanjas tácticas de contención antivehículo del CEO-LCC.",
        "Inhabilitación de 150 metros de huella clandestina para impedir el paso de nuevas caravanas.",
        "Traslado seguro de motorizados incautados al recinto de Aduana Pastocalle."
      ]
    }
  }
];

