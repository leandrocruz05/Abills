import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contextos/AuthContext';
import { useAgregarTransaccion, useEditarTransaccion, useEliminarTransaccion, useCategorias, useHistorialDescripciones } from '../hooks/useFirestore';
import { X, ChevronLeft, ChevronRight, Delete, Search, Settings, Plus, Calendar, CreditCard, Wallet, TrendingUp, Trash2 } from 'lucide-react';
import ModalAdministrarCategorias from './ModalAdministrarCategorias';
import ModalNuevaCategoria from './ModalNuevaCategoria';
import IconoCategoria from './IconoCategoria';

// ─── Configuración por tipo ────────────────────────────────────────────────────
const CONFIG = {
    ingreso: {
        colorTema: '#22c55e',
        colorSombra: 'rgba(34, 197, 94, 0.4)',
        titulo: 'Nuevo Ingreso',
        labelMonto: 'Valor del ingreso',
        mostrarToggleRealizado: false,
        categorias: [
            { id: '1', nombre: 'Ajuste', color: '#6b7280', tipo: 'ajuste', seleccionable: true },
            { id: '2', nombre: 'Inversiones', color: '#22c55e', tipo: 'inversiones', seleccionable: true },
            { id: '3', nombre: 'Salario', color: '#ef4444', tipo: 'salario', seleccionable: true },
        ],
    },
    egreso: {
        colorTema: '#ef4444',
        colorSombra: 'rgba(239, 68, 68, 0.4)',
        titulo: 'Nuevo Gasto',
        labelMonto: 'Cantidad de gastos',
        mostrarToggleRealizado: false,
        categorias: [
            { id: '1', nombre: 'Ajuste', color: '#6b7280', tipo: 'ajuste', seleccionable: true },
            { id: '2', nombre: 'Casa', color: '#f59e0b', tipo: 'casa', seleccionable: true },
            { id: '3', nombre: 'Gastos Compartidos', color: '#a855f7', tipo: 'compartidos', seleccionable: true },
            { id: '4', nombre: 'Gastos Individuales', color: '#06b6d4', tipo: 'individuales', seleccionable: true },
            { id: '5', nombre: 'Inversiones', color: '#22c55e', tipo: 'inversiones', seleccionable: true },
            { id: '6', nombre: 'Pagos', color: '#ef4444', tipo: 'pagos', seleccionable: true },
        ],
    },
};

// ─── Componente principal ──────────────────────────────────────────────────────
function ModalMovimiento({ tipo = 'ingreso', mostrar, alCerrar, cerrar, cuentas = [], mesActual, anoActual, transaccionEditar = null }) {
    const cfg = CONFIG[tipo] ?? CONFIG.ingreso;
    const { usuarioActual } = useAuth();
    const { agregar, agregando } = useAgregarTransaccion();
    const { editar, editando } = useEditarTransaccion();
    const { eliminar, eliminando } = useEliminarTransaccion();
    const { categorias: categoriasUsuario, cargando: cargandoCategorias } = useCategorias(usuarioActual?.uid, tipo);

    const [monto, setMonto] = useState('0,00');
    const [inputExpr, setInputExpr] = useState('0');
    const [mostrarTeclado, setMostrarTeclado] = useState(false);
    const [mostrarCalendario, setMostrarCalendario] = useState(false);
    const [mostrarSelectorCuenta, setMostrarSelectorCuenta] = useState(false);
    const [mostrarSelectorCategoria, setMostrarSelectorCategoria] = useState(false);
    const [mostrarAdministrarCategorias, setMostrarAdministrarCategorias] = useState(false);
    const [mostrarNuevaCategoria, setMostrarNuevaCategoria] = useState(false);

    const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
    const [periodoFecha, setPeriodoFecha] = useState('Hoy');
    const [cuenta, setCuenta] = useState(null);
    const [categoria, setCategoria] = useState(null);
    const [descripcion, setDescripcion] = useState('');
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
    const [busquedaCuenta, setBusquedaCuenta] = useState('');
    const [busquedaCategoria, setBusquedaCategoria] = useState('');
    const [realizado, setRealizado] = useState(true);

    const [mesCalendario, setMesCalendario] = useState(new Date().getMonth());
    const [anoCalendario, setAnoCalendario] = useState(new Date().getFullYear());

    // Usar categorías del usuario desde Firebase
    const categorias = categoriasUsuario;

    // Historial de descripciones para autocompletar
    const { historial: historialDescripciones } = useHistorialDescripciones(usuarioActual?.uid, tipo);

    const sugerenciasFiltradas = useMemo(() => {
        const q = descripcion.trim().toLowerCase();
        if (!q) return [];
        return historialDescripciones
            .filter(h => h.descripcion.toLowerCase().includes(q))
            .slice(0, 6);
    }, [descripcion, historialDescripciones]);

    const aplicarSugerencia = (item) => {
        setDescripcion(item.descripcion);
        setMostrarSugerencias(false);
        if (item.categoria) {
            const catEncontrada = categorias.find(c => c.nombre === item.categoria);
            if (catEncontrada) setCategoria(catEncontrada);
        }
        if (item.cuentaId) {
            const ctaEncontrada = cuentas.find(c => c.id === item.cuentaId);
            if (ctaEncontrada) setCuenta(ctaEncontrada);
        }
    };

    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];

    if (typeof mostrar !== 'undefined' && !mostrar) return null;
    const cerrarModal = alCerrar || cerrar || (() => { });

    // Cargar datos de la transacción a editar
    useEffect(() => {
        if (transaccionEditar) {
            // Cargar monto
            const montoFormateado = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(transaccionEditar.monto);
            setMonto(montoFormateado);
            setInputExpr(String(transaccionEditar.monto));

            // Cargar fecha
            const fecha = new Date(transaccionEditar.fecha);
            setFechaSeleccionada(fecha);
            setMesCalendario(fecha.getMonth());
            setAnoCalendario(fecha.getFullYear());

            // Actualizar periodo fecha
            const hoy = new Date();
            if (fecha.toDateString() === hoy.toDateString()) {
                setPeriodoFecha('Hoy');
            } else {
                const ayer = new Date(hoy);
                ayer.setDate(ayer.getDate() - 1);
                if (fecha.toDateString() === ayer.toDateString()) {
                    setPeriodoFecha('Ayer');
                } else {
                    setPeriodoFecha(fecha.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }));
                }
            }

            // Cargar cuenta
            const cuentaEncontrada = cuentas.find(c => c.id === transaccionEditar.cuentaId);
            if (cuentaEncontrada) {
                setCuenta(cuentaEncontrada);
            }

            // Cargar categoría (se cargará cuando categorias esté disponible)
            if (transaccionEditar.categoria) {
                const categoriaEncontrada = categoriasUsuario.find(c => c.nombre === transaccionEditar.categoria);
                if (categoriaEncontrada) {
                    setCategoria(categoriaEncontrada);
                }
            }

            // Cargar descripción
            if (transaccionEditar.descripcion) {
                setDescripcion(transaccionEditar.descripcion);
            }

            // Cargar realizado
            if (typeof transaccionEditar.realizado !== 'undefined') {
                setRealizado(transaccionEditar.realizado);
            }
        }
    }, [transaccionEditar, cuentas, categoriasUsuario]);

    // ── Lógica del teclado ──────────────────────────────────────────────────────
    const formatNumber = (num) => {
        if (isNaN(num) || num === null) return monto;
        try {
            return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
        } catch { return String(num); }
    };

    const safeEvaluate = (expr) => {
        try {
            if (/[^0-9.+\-*/()s]/.test(expr)) return NaN;
            const fn = new Function('return ' + expr);
            const res = fn();
            return typeof res === 'number' && isFinite(res) ? res : NaN;
        } catch { return NaN; }
    };

    const manejarTeclaNumero = (n) =>
        setInputExpr(prev => prev === '0' ? String(n) : prev + String(n));

    const manejarTeclaComa = () =>
        setInputExpr(prev => {
            const match = prev.match(/(\d+\.?\d*)$/);
            if (!match) return prev + '0.';
            if (match[0].includes('.')) return prev;
            return prev + '.';
        });

    const manejarBorrar = () =>
        setInputExpr(prev => (!prev || prev.length <= 1) ? '0' : prev.slice(0, -1));

    const evalExpr = (raw) => {
        const expr = raw.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
        return safeEvaluate(expr);
    };

    const manejarOkTeclado = () => {
        const val = evalExpr(inputExpr);
        if (!isNaN(val)) { setMonto(formatNumber(val)); setInputExpr(String(val)); }
        setMostrarTeclado(false);
    };

    const manejarCancelarTeclado = () => {
        setInputExpr('0'); setMonto('0,00'); setMostrarTeclado(false);
    };

    const manejarOperador = (op) =>
        setInputExpr(prev => /[+\-×÷*/]$/.test(prev) ? prev.slice(0, -1) + op : prev + op);

    const manejarPorcentaje = () =>
        setInputExpr(prev => {
            const match = prev.match(/(\d+\.?\d*)$/);
            if (!match) return prev;
            return prev.slice(0, -match[0].length) + String(parseFloat(match[0]) / 100);
        });

    const manejarIgual = () => {
        const val = evalExpr(inputExpr);
        if (!isNaN(val)) { setMonto(formatNumber(val)); setInputExpr(String(val)); }
    };

    // Vincula teclado físico con el teclado en pantalla cuando está visible
    useEffect(() => {
        if (!mostrarTeclado) return;

        const esCampoEditable = (el) => {
            if (!el) return false;
            const tag = el.tagName;
            return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
        };

        const manejarKeyDown = (e) => {
            if (esCampoEditable(e.target)) return;

            const { key } = e;

            if (/^\d$/.test(key)) {
                e.preventDefault();
                manejarTeclaNumero(Number(key));
                return;
            }

            if (key === '.' || key === ',') {
                e.preventDefault();
                manejarTeclaComa();
                return;
            }

            if (key === '+' || key === '-' || key === '*' || key === '/') {
                e.preventDefault();
                const opMap = { '+': '+', '-': '−', '*': '×', '/': '÷' };
                manejarOperador(opMap[key]);
                return;
            }

            if (key === 'Backspace' || key === 'Delete') {
                e.preventDefault();
                manejarBorrar();
                return;
            }

            if (key === 'Enter') {
                e.preventDefault();
                manejarOkTeclado();
                return;
            }

            if (key === '=') {
                e.preventDefault();
                manejarIgual();
                return;
            }

            if (key === 'Escape') {
                e.preventDefault();
                manejarCancelarTeclado();
            }
        };

        window.addEventListener('keydown', manejarKeyDown);
        return () => window.removeEventListener('keydown', manejarKeyDown);
    }, [mostrarTeclado, manejarTeclaComa, manejarTeclaNumero, manejarOperador, manejarBorrar, manejarIgual]);

    // ── Lógica de fecha ─────────────────────────────────────────────────────────
    const manejarPeriodoFecha = (periodo) => {
        setPeriodoFecha(periodo);
        const hoy = new Date();
        if (periodo === 'Hoy') {
            setFechaSeleccionada(hoy);
        } else if (periodo === 'Ayer') {
            const ayer = new Date(hoy); ayer.setDate(ayer.getDate() - 1);
            setFechaSeleccionada(ayer);
        } else if (periodo === 'Otros...') {
            setMostrarCalendario(true);
        }
    };

    const manejarSeleccionFecha = (dia) => {
        setFechaSeleccionada(new Date(anoCalendario, mesCalendario, dia));
        setMostrarCalendario(false);
        setPeriodoFecha('Otros...');
    };

    const manejarCambioMes = (dir) => {
        if (dir === 'prev') {
            mesCalendario === 0
                ? (setMesCalendario(11), setAnoCalendario(a => a - 1))
                : setMesCalendario(m => m - 1);
        } else {
            mesCalendario === 11
                ? (setMesCalendario(0), setAnoCalendario(a => a + 1))
                : setMesCalendario(m => m + 1);
        }
    };

    const obtenerDias = () => {
        const primerDia = new Date(anoCalendario, mesCalendario, 1).getDay();
        const primerDiaAjustado = primerDia === 0 ? 6 : primerDia - 1; // Ajustar para lunes como primer día
        const totalDias = new Date(anoCalendario, mesCalendario + 1, 0).getDate();
        return [
            ...Array(primerDiaAjustado).fill(null),
            ...Array.from({ length: totalDias }, (_, i) => i + 1),
        ];
    };

    // ── Lógica cuenta/categoría ─────────────────────────────────────────────────
    const cuentasFiltradas = cuentas.filter(c =>
        c.nombre.toLowerCase().includes(busquedaCuenta.toLowerCase())
    );
    const categoriasFiltradas = categorias.filter(c =>
        c.nombre.toLowerCase().includes(busquedaCategoria.toLowerCase())
    );

    const manejarConfirmar = async () => {
        const val = !isNaN(parseFloat(inputExpr))
            ? evalExpr(inputExpr)
            : safeEvaluate(monto.replace(/\./g, '').replace(/,/g, '.'));

        if (!cuenta) {
            alert('Por favor selecciona una cuenta');
            return;
        }

        if (!categoria) {
            alert('Por favor selecciona una categoría');
            return;
        }

        // Usar mesActual y anoActual pasados por props o fecha seleccionada
        const fechaMes = fechaSeleccionada.getMonth();
        const fechaAno = fechaSeleccionada.getFullYear();

        const transaccion = {
            tipo,
            monto: val,
            fecha: fechaSeleccionada.toISOString(),
            cuentaId: cuenta.id,
            categoria: categoria.nombre,
            color: categoria.color, // Guardar el color de la categoría
            descripcion: descripcion || '',
            realizado: realizado
        };

        let exito;
        if (transaccionEditar) {
            exito = await editar(usuarioActual?.uid, fechaMes, fechaAno, transaccionEditar.id, transaccion);
        } else {
            exito = await agregar(usuarioActual?.uid, fechaMes, fechaAno, transaccion);
        }

        if (exito) {
            console.log(`${transaccionEditar ? 'Editado' : 'Guardado'} exitosamente`);
            cerrarModal();
        } else {
            alert('Error al guardar. Intenta nuevamente.');
        }
    };

    const manejarEliminar = async () => {
        if (!transaccionEditar) return;
        
        const confirmar = window.confirm('¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer.');
        
        if (!confirmar) return;

        const fechaMes = new Date(transaccionEditar.fecha).getMonth();
        const fechaAno = new Date(transaccionEditar.fecha).getFullYear();

        const exito = await eliminar(usuarioActual?.uid, fechaMes, fechaAno, transaccionEditar.id);

        if (exito) {
            console.log('Transacción eliminada exitosamente');
            cerrarModal();
        } else {
            alert('Error al eliminar. Intenta nuevamente.');
        }
    };

    const fechaFormateada = fechaSeleccionada.toLocaleDateString('es-AR', {
        weekday: 'short', day: '2-digit', month: 'short',
    });

    // ── CSS variable de tema ────────────────────────────────────────────────────
    const estiloTema = {
        '--color-tema': cfg.colorTema,
        '--color-tema-sombra': cfg.colorSombra,
    };

    return (
        <>
            <div className="modal-overlay-movimiento" onClick={cerrarModal} />

            <div className="modal-movimiento" style={estiloTema}>
                {/* Header */}
                <div className="modal-movimiento-header">
                    <button className="btn-cerrar-modal" onClick={cerrarModal}>
                        <X size={24} />
                    </button>
                    <h2>{transaccionEditar ? (tipo === 'ingreso' ? 'Editar Ingreso' : 'Editar Gasto') : cfg.titulo}</h2>
                    {transaccionEditar && (
                        <button 
                            className="btn-eliminar-modal" 
                            onClick={manejarEliminar}
                            disabled={eliminando}
                            title="Eliminar transacción"
                        >
                            {eliminando ? (
                                <svg className="spinner" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <circle cx="12" cy="12" r="10" opacity="0.25" />
                                    <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round" />
                                </svg>
                            ) : (
                                <Trash2 size={22} />
                            )}
                        </button>
                    )}
                </div>

                <div className="modal-movimiento-contenido">
                    {/* Monto */}
                    <div className="seccion-monto" onClick={() => setMostrarTeclado(true)}>
                        <p className="label-monto">{cfg.labelMonto}</p>
                        <h1 className="valor-monto">$ {monto}</h1>
                    </div>

                    {/* Toggle Realizado (solo egreso) */}
                    {cfg.mostrarToggleRealizado && (
                        <div className="movimiento-realizado-row" onClick={() => setRealizado(r => !r)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Realizado</span>
                            <div className={`movimiento-toggle ${realizado ? 'activo' : ''}`}>
                                <div className="movimiento-toggle-circulo" />
                            </div>
                        </div>
                    )}

                    {/* Selector de período */}
                    {periodoFecha !== 'Otros...' ? (
                        <div className="selector-periodo">
                            {['Hoy', 'Ayer', 'Otros...'].map(p => (
                                <button
                                    key={p}
                                    className={`btn-periodo ${periodoFecha === p ? 'activo' : ''}`}
                                    onClick={() => manejarPeriodoFecha(p)}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="fecha-seleccionada-compacta" onClick={() => setMostrarCalendario(true)}>
                            <Calendar size={20} strokeWidth={2} />
                            <span>{fechaFormateada}</span>
                            <button 
                                className="btn-cambiar-fecha"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPeriodoFecha('Hoy');
                                    setFechaSeleccionada(new Date());
                                }}
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>
                    )}

                    {/* Descripción */}
                    <div className="seccion-observacion-wrapper">
                        <div className="seccion-observacion">
                            <div className="observacion-icono">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                                    <path d="M3 6h18M3 12h18M3 18h18" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                className="input-observacion"
                                placeholder="Descripción"
                                value={descripcion}
                                autoComplete="off"
                                onChange={e => { setDescripcion(e.target.value); setMostrarSugerencias(e.target.value.trim().length > 0); }}
                                onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
                            />
                        </div>
                        {mostrarSugerencias && sugerenciasFiltradas.length > 0 && (
                            <div className="sugerencias-descripcion">
                                {sugerenciasFiltradas.map((item, i) => (
                                    <div
                                        key={i}
                                        className="sugerencia-item"
                                        onMouseDown={() => aplicarSugerencia(item)}
                                    >
                                        <span className="sugerencia-texto">{item.descripcion}</span>
                                        {item.categoria && (
                                            <span
                                                className="sugerencia-badge"
                                                style={{ background: item.color || 'rgba(255,255,255,0.15)' }}
                                            >
                                                {item.categoria}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Categoría */}
                    <div className="seccion-cuenta" onClick={() => setMostrarSelectorCategoria(true)}>
                        <div className="cuenta-icono-placeholder" style={{ background: categoria?.color || 'rgba(255,255,255,0.1)' }}>
                            {categoria
                                ? <IconoCategoria tipo={categoria.icono || categoria.tipo} />
                                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <rect x="2" y="2" width="8" height="8" rx="1" /><rect x="14" y="2" width="8" height="8" rx="1" />
                                    <rect x="14" y="14" width="8" height="8" rx="1" /><rect x="2" y="14" width="8" height="8" rx="1" />
                                </svg>
                            }
                        </div>
                        <div className="cuenta-info-selector">
                            <span className="cuenta-label">Categoría</span>
                            {categoria && <span className="cuenta-nombre-seleccionada">{categoria.nombre}</span>}
                        </div>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                            <path d="M7 10l5 5 5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>

                    {/* Cuenta */}
                    <div className="seccion-cuenta" onClick={() => setMostrarSelectorCuenta(true)}>
                        <div className={`cuenta-icono-placeholder ${cuenta ? cuenta.tipo : ''}`} style={cuenta ? {} : {}}>
                            {cuenta ? (
                                <>
                                    {cuenta.tipo === 'debit' && <CreditCard size={20} color="white" />}
                                    {cuenta.tipo === 'cash' && <Wallet size={20} color="white" />}
                                    {cuenta.tipo === 'investments' && <TrendingUp size={20} color="white" />}
                                </>
                            ) : (
                                <Wallet size={20} color="rgba(255,255,255,0.6)" />
                            )}
                        </div>
                        <div className="cuenta-info-selector">
                            <span className="cuenta-label">Cuenta</span>
                            {cuenta && <span className="cuenta-nombre-seleccionada">{cuenta.nombre}</span>}
                        </div>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                            <path d="M7 10l5 5 5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>

                {/* Botón confirmar */}
                <button 
                    className="btn-confirmar-movimiento" 
                    onClick={manejarConfirmar}
                    disabled={agregando || editando}
                    style={{ opacity: (agregando || editando) ? 0.6 : 1 }}
                >
                    {(agregando || editando) ? (
                        <svg className="spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <circle cx="12" cy="12" r="10" opacity="0.25" />
                            <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round" />
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    )}
                </button>
            </div>

            {/* ── TECLADO ─────────────────────────────────────────────────────── */}
            {mostrarTeclado && (
                <>
                    <div className="modal-overlay-teclado" onClick={manejarCancelarTeclado} />
                    <div className="teclado-numerico-movimiento" style={estiloTema}>
                        <div className="teclado-display">
                            <span className="teclado-simbolo">$</span>
                            <span className="teclado-valor">{inputExpr}</span>
                            <button className="teclado-borrar" onClick={manejarBorrar}><Delete size={20} /></button>
                        </div>

                        <div className="teclado-botones">
                            {[7, 8, 9].map(n => <button key={n} onClick={() => manejarTeclaNumero(n)}>{n}</button>)}
                            <button className="teclado-operador" onClick={() => manejarOperador('÷')}>÷</button>
                            {[4, 5, 6].map(n => <button key={n} onClick={() => manejarTeclaNumero(n)}>{n}</button>)}
                            <button className="teclado-operador" onClick={() => manejarOperador('×')}>×</button>
                            {[1, 2, 3].map(n => <button key={n} onClick={() => manejarTeclaNumero(n)}>{n}</button>)}
                            <button className="teclado-operador" onClick={() => manejarOperador('−')}>−</button>
                            <button onClick={manejarPorcentaje}>%</button>
                            <button onClick={() => manejarTeclaNumero(0)}>0</button>
                            <button onClick={manejarTeclaComa}>.</button>
                            <button className="teclado-operador" onClick={() => manejarOperador('+')}>+</button>
                            <button className="teclado-igual-movimiento" onClick={manejarIgual} style={{ gridColumn: 'span 4' }}>=</button>
                        </div>

                        <div className="teclado-acciones">
                            <button className="btn-teclado-cancelar" onClick={manejarCancelarTeclado}>CANCELAR</button>
                            <button className="btn-teclado-ok-movimiento" onClick={manejarOkTeclado}>OK</button>
                        </div>
                    </div>
                </>
            )}

            {/* ── CALENDARIO ──────────────────────────────────────────────────── */}
            {mostrarCalendario && (
                <>
                    <div className="modal-overlay-calendario" onClick={() => setMostrarCalendario(false)} />
                    <div className="calendario-selector-movimiento" style={estiloTema}>
                        <div className="calendario-header">
                            <h3>{anoCalendario}</h3>
                            <h2>{fechaFormateada}</h2>
                        </div>

                        <div className="calendario-navegacion">
                            <button onClick={() => manejarCambioMes('prev')}><ChevronLeft size={20} strokeWidth={2.5} /></button>
                            <span className="calendario-mes-actual">{meses[mesCalendario]} de {anoCalendario}</span>
                            <button onClick={() => manejarCambioMes('next')}><ChevronRight size={24} strokeWidth={2.5} /></button>
                        </div>

                        <div className="calendario-dias-semana">
                            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <span key={d}>{d}</span>)}
                        </div>

                        <div className="calendario-dias">
                            {obtenerDias().map((dia, i) => (
                                <button
                                    key={i}
                                    className={`calendario-dia ${!dia ? 'vacio' : ''} ${dia === fechaSeleccionada.getDate() &&
                                        mesCalendario === fechaSeleccionada.getMonth() &&
                                        anoCalendario === fechaSeleccionada.getFullYear()
                                        ? 'activo' : ''
                                        }`}
                                    onClick={() => dia && manejarSeleccionFecha(dia)}
                                    disabled={!dia}
                                >
                                    {dia}
                                </button>
                            ))}
                        </div>

                        <div className="calendario-acciones">
                            <button className="btn-calendario-cancelar" onClick={() => setMostrarCalendario(false)}>CANCELAR</button>
                            <button className="btn-calendario-aceptar-movimiento" onClick={() => setMostrarCalendario(false)}>ACEPTAR</button>
                        </div>
                    </div>
                </>
            )}

            {/* ── SELECTOR CUENTAS ────────────────────────────────────────────── */}
            {mostrarSelectorCuenta && (
                <>
                    <div className="modal-overlay-selector-cuenta" onClick={() => setMostrarSelectorCuenta(false)} />
                    <div className="selector-cuentas" style={estiloTema}>
                        <div className="selector-cuentas-busqueda">
                            <Search size={20} />
                            <input
                                type="text"
                                placeholder="Buscar cuenta"
                                value={busquedaCuenta}
                                onChange={e => setBusquedaCuenta(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="selector-cuentas-lista">
                            {cuentasFiltradas.map(cta => (
                                <div
                                    key={cta.id}
                                    className={`selector-cuenta-item ${cuenta?.id === cta.id ? 'seleccionado' : ''}`}
                                    onClick={() => { setCuenta(cta); setMostrarSelectorCuenta(false); setBusquedaCuenta(''); }}
                                >
                                    <div className={`selector-cuenta-icono ${cta.tipo}`}>
                                        {cta.tipo === 'debit' && <CreditCard size={20} color="white" />}
                                        {cta.tipo === 'cash' && <Wallet size={20} color="white" />}
                                        {cta.tipo === 'investments' && <TrendingUp size={20} color="white" />}
                                    </div>
                                    <span className="selector-cuenta-nombre">{cta.nombre}</span>
                                    <div className="selector-cuenta-radio">
                                        <input type="radio" name="cuenta-mov" checked={cuenta?.id === cta.id} readOnly style={{ pointerEvents: 'none' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* ── SELECTOR CATEGORÍAS ─────────────────────────────────────────── */}
            {mostrarSelectorCategoria && (
                <>
                    <div className="modal-overlay-selector-categoria" onClick={() => setMostrarSelectorCategoria(false)} />
                    <div className="selector-categorias" style={estiloTema}>
                        <div className="selector-categorias-busqueda">
                            <Search size={20} />
                            <input
                                type="text"
                                placeholder="Buscar categoría"
                                value={busquedaCategoria}
                                onChange={e => setBusquedaCategoria(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="selector-categorias-lista">
                            {categoriasFiltradas.map(cat => (
                                <div
                                    key={cat.id}
                                    className="selector-categoria-item"
                                    onClick={() => { setCategoria(cat); setMostrarSelectorCategoria(false); setBusquedaCategoria(''); }}
                                >
                                    <div className="selector-categoria-icono" style={{ background: cat.color }}>
                                        <IconoCategoria tipo={cat.icono || cat.tipo} />
                                    </div>
                                    <span className="selector-categoria-nombre">{cat.nombre}</span>
                                    <div className="selector-categoria-radio">
                                        <input type="radio" name="cat-mov" checked={categoria?.id === cat.id} readOnly style={{ pointerEvents: 'none' }} />
                                    </div>
                                </div>
                            ))}

                            <div className="selector-categoria-separador" />
                            <div 
                                className="selector-categoria-opcion" 
                                onClick={() => {
                                    setMostrarSelectorCategoria(false);
                                    setMostrarAdministrarCategorias(true);
                                }}
                            >
                                <Settings size={20} />
                                <span>Administrar categorías</span>
                            </div>
                            <div 
                                className="selector-categoria-opcion"
                                onClick={() => {
                                    setMostrarSelectorCategoria(false);
                                    setMostrarNuevaCategoria(true);
                                }}
                            >
                                <Plus size={20} />
                                <span>Crear nueva categoría</span>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── MODALES DE GESTIÓN DE CATEGORÍAS ────────────────────────────── */}
            <ModalAdministrarCategorias 
                mostrar={mostrarAdministrarCategorias}
                cerrar={() => setMostrarAdministrarCategorias(false)}
                tipo={tipo}
            />
            
            <ModalNuevaCategoria 
                mostrar={mostrarNuevaCategoria}
                cerrar={() => setMostrarNuevaCategoria(false)}
                tipo={tipo}
            />
        </>
    );
}

export default ModalMovimiento;
