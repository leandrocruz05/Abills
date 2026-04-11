import { useState, useMemo } from 'react';
import { useAuth } from '../contextos/AuthContext';
import { useDatosMensuales } from '../hooks/useFirestore';
import NavegacionInferior from './NavegacionInferior';
import { Target, TrendingUp, Plus, Edit2, Trash2, Save, X } from 'lucide-react';

function Planificacion() {
    const { usuarioActual } = useAuth();
    const fechaActual = new Date();
    const [mesActual] = useState(fechaActual.getMonth());
    const [anoActual] = useState(fechaActual.getFullYear());
    
    const { datosMensuales, cargando } = useDatosMensuales(usuarioActual?.uid, mesActual, anoActual);
    
    const [objetivoAhorro, setObjetivoAhorro] = useState(50000); // Por ahora hardcodeado
    const [mostrarModalMeta, setMostrarModalMeta] = useState(false);
    const [metaEditando, setMetaEditando] = useState(null);
    
    // Metas de ahorro (por ahora en estado local, luego en Firestore)
    const [metas, setMetas] = useState([
        {
            id: '1',
            nombre: 'Vacaciones 2026',
            montoObjetivo: 200000,
            montoActual: 75000,
            fechaObjetivo: '2026-12-31',
            color: '#8b5cf6',
            aportes: [
                { id: '1-1', mes: 'Enero 2026', monto: 25000, fecha: '2026-01-15' },
                { id: '1-2', mes: 'Febrero 2026', monto: 50000, fecha: '2026-02-10' }
            ]
        },
        {
            id: '2',
            nombre: 'Fondo de Emergencia',
            montoObjetivo: 300000,
            montoActual: 150000,
            fechaObjetivo: '2026-06-30',
            color: '#f59e0b',
            aportes: [
                { id: '2-1', mes: 'Enero 2026', monto: 150000, fecha: '2026-01-20' }
            ]
        }
    ]);

    const [metaAportando, setMetaAportando] = useState(null);
    const [mesNuevoAporte, setMesNuevoAporte] = useState('');
    const [montoAporte, setMontoAporte] = useState('');
    
    const [aporteEditando, setAporteEditando] = useState(null);
    const [mesEdit, setMesEdit] = useState('');
    const [montoEdit, setMontoEdit] = useState('');

    // Calcular ahorro mensual actual
    const ahorroActual = useMemo(() => {
        if (!datosMensuales) return 0;
        return (datosMensuales.ingresoTotal || 0) - (datosMensuales.gastosTotal || 0);
    }, [datosMensuales]);

    const porcentajeObjetivo = useMemo(() => {
        if (objetivoAhorro === 0) return 0;
        return Math.min((ahorroActual / objetivoAhorro) * 100, 100);
    }, [ahorroActual, objetivoAhorro]);

    const formatearMoneda = (monto) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
        }).format(monto);
    };

    const formatearFecha = (fechaStr) => {
        const fecha = new Date(fechaStr);
        return fecha.toLocaleDateString('es-AR', { year: 'numeric', month: 'long' });
    };

    const calcularDiasRestantes = (fechaObjetivo) => {
        const hoy = new Date();
        const objetivo = new Date(fechaObjetivo);
        const diferencia = objetivo - hoy;
        const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
        return dias > 0 ? dias : 0;
    };

    const abrirModalNuevaMeta = () => {
        setMetaEditando(null);
        setMostrarModalMeta(true);
    };

    const abrirModalEditarMeta = (meta) => {
        setMetaEditando(meta);
        setMostrarModalMeta(true);
    };

    const eliminarMeta = (metaId) => {
        if (window.confirm('¿Estás seguro de eliminar esta meta?')) {
            setMetas(metas.filter(m => m.id !== metaId));
        }
    };

    const agregarAporte = (metaId) => {
        if (!mesNuevoAporte.trim() || !montoAporte) {
            alert('Por favor completa el mes y el monto');
            return;
        }

        const montoNumerico = parseFloat(montoAporte);
        if (isNaN(montoNumerico) || montoNumerico <= 0) {
            alert('El monto debe ser un número válido mayor a cero');
            return;
        }

        const fecha = new Date();

        const nuevoAporte = {
            id: `${metaId}-${Date.now()}`,
            mes: mesNuevoAporte.trim(),
            monto: montoNumerico,
            fecha: fecha.toISOString()
        };

        setMetas(metas.map(meta => {
            if (meta.id === metaId) {
                const montoActualSafe = meta.montoActual || 0;
                return {
                    ...meta,
                    montoActual: montoActualSafe + nuevoAporte.monto,
                    aportes: [...(meta.aportes || []), nuevoAporte]
                };
            }
            return meta;
        }));

        setMesNuevoAporte('');
        setMontoAporte('');
        setMetaAportando(null);
    };

    const editarAporte = (metaId, aporteId) => {
        if (!mesEdit.trim() || !montoEdit) {
            alert('Por favor completa el mes y el monto');
            return;
        }

        const montoNumerico = parseFloat(montoEdit);
        if (isNaN(montoNumerico) || montoNumerico <= 0) {
            alert('El monto debe ser un número válido mayor a cero');
            return;
        }

        setMetas(metas.map(meta => {
            if (meta.id === metaId) {
                const aporteAnterior = meta.aportes.find(a => a.id === aporteId);
                const diferenciaMonto = montoNumerico - aporteAnterior.monto;
                const montoActualSafe = meta.montoActual || 0;
                
                return {
                    ...meta,
                    montoActual: montoActualSafe + diferenciaMonto,
                    aportes: meta.aportes.map(a => 
                        a.id === aporteId 
                            ? { ...a, mes: mesEdit.trim(), monto: montoNumerico }
                            : a
                    )
                };
            }
            return meta;
        }));

        setAporteEditando(null);
        setMesEdit('');
        setMontoEdit('');
    };

    const eliminarAporte = (metaId, aporteId) => {
        if (!window.confirm('¿Estás seguro de eliminar este aporte?')) {
            return;
        }

        setMetas(metas.map(meta => {
            if (meta.id === metaId) {
                const aporteAEliminar = meta.aportes.find(a => a.id === aporteId);
                const montoActualSafe = meta.montoActual || 0;
                
                return {
                    ...meta,
                    montoActual: montoActualSafe - aporteAEliminar.monto,
                    aportes: meta.aportes.filter(a => a.id !== aporteId)
                };
            }
            return meta;
        }));
    };

    const iniciarEdicionAporte = (aporte) => {
        setAporteEditando(aporte.id);
        setMesEdit(aporte.mes);
        setMontoEdit(aporte.monto.toString());
    };

    const cancelarEdicionAporte = () => {
        setAporteEditando(null);
        setMesEdit('');
        setMontoEdit('');
    };

    if (cargando) {
        return (
            <div className="planificacion-container">
                <div className="loading">Cargando...</div>
                <NavegacionInferior 
                    tabActiva="planificacion"
                    cuentas={[]}
                    mesActual={mesActual}
                    anoActual={anoActual}
                />
            </div>
        );
    }

    return (
        <div className="planificacion-container">
            {/* Sección: Ahorro Mensual */}
            <section className="ahorro-mensual-section">
                <div className="section-header">
                    <h2 className="section-title-main">
                        <TrendingUp size={24} />
                        Ahorro Mensual
                    </h2>
                </div>

                <div className="ahorro-mensual-card">
                    <div className="ahorro-info">
                        <div className="ahorro-actual">
                            <span className="ahorro-label">Ahorro del Mes</span>
                            <span className={`ahorro-monto ${ahorroActual >= 0 ? 'amount-positive' : 'amount-negative'}`}>
                                {formatearMoneda(ahorroActual)}
                            </span>
                        </div>
                        <div className="ahorro-objetivo">
                            <span className="ahorro-label">Objetivo</span>
                            <span className="ahorro-monto">{formatearMoneda(objetivoAhorro)}</span>
                        </div>
                    </div>

                    <div className="ahorro-progreso-container">
                        <div className="ahorro-progreso-bar">
                            <div 
                                className="ahorro-progreso-fill"
                                style={{ 
                                    width: `${porcentajeObjetivo}%`,
                                    backgroundColor: ahorroActual >= objetivoAhorro ? '#22c55e' : '#8b5cf6'
                                }}
                            />
                        </div>
                        <span className="ahorro-progreso-text">
                            {porcentajeObjetivo.toFixed(1)}% del objetivo
                        </span>
                    </div>

                    <div className="ahorro-detalle">
                        <div className="ahorro-detalle-item">
                            <span className="detalle-label">Ingresos</span>
                            <span className="detalle-valor amount-positive">
                                {formatearMoneda(datosMensuales?.ingresoTotal || 0)}
                            </span>
                        </div>
                        <div className="ahorro-detalle-item">
                            <span className="detalle-label">Gastos</span>
                            <span className="detalle-valor amount-negative">
                                {formatearMoneda(datosMensuales?.gastosTotal || 0)}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sección: Metas de Ahorro */}
            <section className="metas-ahorro-section">
                <div className="section-header">
                    <h2 className="section-title-main">
                        <Target size={24} />
                        Metas de Ahorro
                    </h2>
                    <button className="btn-agregar-meta" onClick={abrirModalNuevaMeta}>
                        <Plus size={20} />
                        Nueva Meta
                    </button>
                </div>

                <div className="metas-lista">
                    {metas.length === 0 ? (
                        <div className="no-metas">
                            <Target size={48} opacity={0.3} />
                            <p>No tienes metas de ahorro creadas</p>
                            <button className="btn-crear-primera-meta" onClick={abrirModalNuevaMeta}>
                                Crear Primera Meta
                            </button>
                        </div>
                    ) : (
                        metas.map(meta => {
                            const porcentaje = (meta.montoActual / meta.montoObjetivo) * 100;
                            const diasRestantes = calcularDiasRestantes(meta.fechaObjetivo);
                            
                            return (
                                <div key={meta.id} className="meta-card">
                                    <div className="meta-header">
                                        <div className="meta-icono" style={{ backgroundColor: meta.color }}>
                                            <Target size={24} color="white" />
                                        </div>
                                        <div className="meta-info">
                                            <h3 className="meta-nombre">{meta.nombre}</h3>
                                            <span className="meta-fecha">
                                                {formatearFecha(meta.fechaObjetivo)} • {diasRestantes} días restantes
                                            </span>
                                        </div>
                                        <div className="meta-acciones">
                                            <button 
                                                className="btn-icono-meta" 
                                                onClick={() => abrirModalEditarMeta(meta)}
                                                title="Editar meta"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button 
                                                className="btn-icono-meta btn-eliminar" 
                                                onClick={() => eliminarMeta(meta.id)}
                                                title="Eliminar meta"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="meta-montos">
                                        <div className="meta-monto-item">
                                            <span className="meta-monto-label">Actual</span>
                                            <span className="meta-monto-valor">{formatearMoneda(meta.montoActual)}</span>
                                        </div>
                                        <div className="meta-monto-item meta-porcentaje-center">
                                            <span className="meta-progreso-text-center">
                                                {porcentaje.toFixed(1)}% completado
                                            </span>
                                        </div>
                                        <div className="meta-monto-item meta-monto-derecha">
                                            <span className="meta-monto-label">Objetivo</span>
                                            <span className="meta-monto-valor">{formatearMoneda(meta.montoObjetivo)}</span>
                                        </div>
                                    </div>

                                    <div className="meta-progreso-container">
                                        <div className="meta-progreso-bar">
                                            <div 
                                                className="meta-progreso-fill"
                                                style={{ 
                                                    width: `${Math.min(porcentaje, 100)}%`,
                                                    backgroundColor: meta.color
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Sección de aportes */}
                                    <div className="meta-aportes-section">
                                        <div className="meta-aportes-header">
                                            <span className="meta-aportes-titulo">Aportes Registrados</span>
                                            {metaAportando === meta.id ? (
                                                <div className="meta-aporte-input-grupo">
                                                    <input
                                                        type="text"
                                                        value={mesNuevoAporte}
                                                        onChange={(e) => setMesNuevoAporte(e.target.value)}
                                                        placeholder="Mes (ej: Febrero 2026)"
                                                        className="input-aporte-mes"
                                                        autoFocus
                                                    />
                                                    <input
                                                        type="number"
                                                        value={montoAporte}
                                                        onChange={(e) => setMontoAporte(e.target.value)}
                                                        placeholder="Monto"
                                                        className="input-aporte"
                                                    />
                                                    <button 
                                                        className="btn-confirmar-aporte"
                                                        onClick={() => agregarAporte(meta.id)}
                                                    >
                                                        <Save size={16} />
                                                    </button>
                                                    <button 
                                                        className="btn-cancelar-aporte"
                                                        onClick={() => {
                                                            setMetaAportando(null);
                                                            setMesNuevoAporte('');
                                                            setMontoAporte('');
                                                        }}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    className="btn-agregar-aporte"
                                                    onClick={() => setMetaAportando(meta.id)}
                                                >
                                                    <Plus size={16} />
                                                    Agregar Aporte
                                                </button>
                                            )}
                                        </div>

                                        {meta.aportes && meta.aportes.length > 0 ? (
                                            <div className="meta-aportes-lista">
                                                {meta.aportes.map(aporte => (
                                                    <div key={aporte.id} className="meta-aporte-item">
                                                        {aporteEditando === aporte.id ? (
                                                            <>
                                                                <div className="aporte-edit-grupo">
                                                                    <input
                                                                        type="text"
                                                                        value={mesEdit}
                                                                        onChange={(e) => setMesEdit(e.target.value)}
                                                                        placeholder="Mes"
                                                                        className="input-aporte-edit-mes"
                                                                    />
                                                                    <input
                                                                        type="number"
                                                                        value={montoEdit}
                                                                        onChange={(e) => setMontoEdit(e.target.value)}
                                                                        placeholder="Monto"
                                                                        className="input-aporte-edit"
                                                                    />
                                                                </div>
                                                                <div className="aporte-acciones">
                                                                    <button 
                                                                        className="btn-aporte-accion btn-guardar"
                                                                        onClick={() => editarAporte(meta.id, aporte.id)}
                                                                        title="Guardar"
                                                                    >
                                                                        <Save size={14} />
                                                                    </button>
                                                                    <button 
                                                                        className="btn-aporte-accion btn-cancelar"
                                                                        onClick={cancelarEdicionAporte}
                                                                        title="Cancelar"
                                                                    >
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="aporte-info">
                                                                    <span className="aporte-mes">{aporte.mes}</span>
                                                                    <span className="aporte-monto">
                                                                        +{formatearMoneda(aporte.monto)}
                                                                    </span>
                                                                </div>
                                                                <div className="aporte-acciones">
                                                                    <button 
                                                                        className="btn-aporte-accion"
                                                                        onClick={() => iniciarEdicionAporte(aporte)}
                                                                        title="Editar"
                                                                    >
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                    <button 
                                                                        className="btn-aporte-accion btn-eliminar"
                                                                        onClick={() => eliminarAporte(meta.id, aporte.id)}
                                                                        title="Eliminar"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="meta-aportes-vacio">
                                                <span>No hay aportes registrados aún</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="meta-faltante">
                                        <span>Faltan {formatearMoneda(meta.montoObjetivo - meta.montoActual)}</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            {/* Modal para crear/editar meta */}
            {mostrarModalMeta && (
                <ModalMeta
                    meta={metaEditando}
                    cerrar={() => setMostrarModalMeta(false)}
                    guardar={(nuevaMeta) => {
                        if (metaEditando) {
                            setMetas(metas.map(m => m.id === metaEditando.id ? { 
                                ...m, 
                                ...nuevaMeta,
                                aportes: m.aportes || [] 
                            } : m));
                        } else {
                            setMetas([...metas, { 
                                ...nuevaMeta, 
                                id: Date.now().toString(),
                                montoActual: 0,
                                aportes: []
                            }]);
                        }
                        setMostrarModalMeta(false);
                    }}
                />
            )}

            {!mostrarModalMeta && (
                <NavegacionInferior 
                    tabActiva="planificacion"
                    cuentas={datosMensuales?.cuentas || []}
                    mesActual={mesActual}
                    anoActual={anoActual}
                />
            )}
        </div>
    );
}

// Modal para crear/editar metas
function ModalMeta({ meta, cerrar, guardar }) {
    const [nombre, setNombre] = useState(meta?.nombre || '');
    const [montoObjetivo, setMontoObjetivo] = useState(meta?.montoObjetivo?.toString() || '');
    const [fechaObjetivo, setFechaObjetivo] = useState(meta?.fechaObjetivo || '');
    const [color, setColor] = useState(meta?.color || '#8b5cf6');

    const coloresDisponibles = [
        '#8b5cf6', // Púrpura
        '#f59e0b', // Ámbar
        '#22c55e', // Verde
        '#3b82f6', // Azul
        '#ef4444', // Rojo
        '#ec4899', // Rosa
        '#14b8a6', // Turquesa
        '#f97316'  // Naranja
    ];

    const manejarGuardar = () => {
        if (!nombre.trim() || !montoObjetivo || !fechaObjetivo) {
            alert('Por favor completa todos los campos');
            return;
        }

        const montoNumerico = parseFloat(montoObjetivo);
        if (isNaN(montoNumerico) || montoNumerico <= 0) {
            alert('El monto debe ser un número válido mayor a cero');
            return;
        }

        guardar({
            nombre: nombre.trim(),
            montoObjetivo: montoNumerico,
            fechaObjetivo,
            color,
            ...(meta ? {} : { montoActual: 0 })
        });
    };

    return (
        <>
            <div className="modal-overlay-meta" onClick={cerrar} />
            <div className="modal-meta">
                <div className="modal-meta-header">
                    <h2>{meta ? 'Editar Meta' : 'Nueva Meta'}</h2>
                    <button className="btn-cerrar-modal" onClick={cerrar}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-meta-contenido">
                    <div className="form-group">
                        <label>Nombre de la Meta</label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej: Vacaciones 2026"
                            className="input-meta"
                        />
                    </div>

                    <div className="form-group">
                        <label>Monto Objetivo</label>
                        <input
                            type="number"
                            value={montoObjetivo}
                            onChange={(e) => setMontoObjetivo(e.target.value)}
                            placeholder="0"
                            className="input-meta"
                        />
                    </div>

                    <div className="form-group">
                        <label>Fecha Objetivo</label>
                        <input
                            type="date"
                            value={fechaObjetivo}
                            onChange={(e) => setFechaObjetivo(e.target.value)}
                            className="input-meta"
                        />
                    </div>

                    <div className="form-group">
                        <label>Color</label>
                        <div className="colores-grid">
                            {coloresDisponibles.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    className={`color-option ${color === c ? 'selected' : ''}`}
                                    style={{ backgroundColor: c, background: c }}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setColor(c);
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="modal-meta-footer">
                    <button className="btn-cancelar-meta" onClick={cerrar}>
                        Cancelar
                    </button>
                    <button className="btn-guardar-meta" onClick={manejarGuardar}>
                        <Save size={20} />
                        Guardar
                    </button>
                </div>
            </div>
        </>
    );
}

export default Planificacion;
