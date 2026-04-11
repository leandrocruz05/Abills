import { useState, useMemo } from 'react';
import { useAuth } from '../contextos/AuthContext';
import { useDatosMensuales, useCategorias } from '../hooks/useFirestore';
import { ChevronDown, ChevronLeft, ChevronRight, Search, Filter, LogOut, MoreHorizontal, Lock, ArrowLeftRight } from 'lucide-react';
import NavegacionInferior from './NavegacionInferior';
import ModalMovimiento from './ModalMovimiento';
import Logo from './Logo';
import IconoCategoria from './IconoCategoria';

function Transacciones() {
    const { usuarioActual, cerrarSesion } = useAuth();
    const [mesActual, setMesActual] = useState(new Date().getMonth());
    const [anoActual, setAnoActual] = useState(new Date().getFullYear());
    const [mostrarSelectorMes, setMostrarSelectorMes] = useState(false);
    const [mostrarDesplegableTipo, setMostrarDesplegableTipo] = useState(false);
    const [tipoSeleccionado, setTipoSeleccionado] = useState('todos'); // 'todos', 'ingreso', 'egreso'
    const [busqueda, setBusqueda] = useState('');
    const [mostrarBusqueda, setMostrarBusqueda] = useState(false);
    const [mostrarFiltroCategoria, setMostrarFiltroCategoria] = useState(false);
    const [categoriaFiltro, setCategoriaFiltro] = useState(null);
    const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
    const [transaccionSeleccionada, setTransaccionSeleccionada] = useState(null);

    // Cargar datos desde Firestore en tiempo real
    const { datos: datosMensuales, cargando } = useDatosMensuales(
        usuarioActual?.uid,
        mesActual,
        anoActual
    );

    // Cargar categorías
    const { categorias: categoriasIngreso } = useCategorias(usuarioActual?.uid, 'ingreso');
    const { categorias: categoriasEgreso } = useCategorias(usuarioActual?.uid, 'egreso');

    const meses = [
        'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
        'JUL', 'AGO', 'SEPT', 'OCT', 'NOV', 'DIC'
    ];

    const mesesCompletos = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const formatearMoneda = (cantidad) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2
        }).format(cantidad);
    };

    // Filtrar transacciones
    const transaccionesFiltradas = useMemo(() => {
        if (!datosMensuales?.transacciones) return [];

        let transacciones = [...datosMensuales.transacciones];

        // Filtrar por tipo
        if (tipoSeleccionado !== 'todos') {
            transacciones = transacciones.filter(t => t.tipo === tipoSeleccionado);
        }

        // Filtrar por búsqueda
        if (busqueda.trim()) {
            const busquedaLower = busqueda.toLowerCase();
            transacciones = transacciones.filter(t =>
                (t.descripcion || '').toLowerCase().includes(busquedaLower) ||
                (t.categoria || '').toLowerCase().includes(busquedaLower)
            );
        }

        // Filtrar por categoría
        if (categoriaFiltro) {
            transacciones = transacciones.filter(t => t.categoria === categoriaFiltro);
        }

        return transacciones;
    }, [datosMensuales, tipoSeleccionado, busqueda, categoriaFiltro]);

    // Agrupar transacciones por día
    const transaccionesAgrupadas = useMemo(() => {
        const grupos = {};

        transaccionesFiltradas.forEach(transaccion => {
            const fecha = new Date(transaccion.fecha);
            const diaMes = fecha.getDate();
            const nombreDia = fecha.toLocaleDateString('es-AR', { weekday: 'long' });
            const clave = `${nombreDia}, ${diaMes}`;

            if (!grupos[clave]) {
                grupos[clave] = {
                    fecha: fecha,
                    transacciones: []
                };
            }

            grupos[clave].transacciones.push(transaccion);
        });

        // Ordenar por fecha descendente
        return Object.entries(grupos).sort((a, b) => b[1].fecha - a[1].fecha);
    }, [transaccionesFiltradas]);

    // Calcular balance del mes
    const balanceMensual = useMemo(() => {
        const ingresos = datosMensuales?.ingresoTotal || 0;
        const gastos = datosMensuales?.gastosTotal || 0;
        return ingresos - gastos;
    }, [datosMensuales]);

    // Calcular saldo final del mes
    const saldoTotal = useMemo(() => {
        if (!datosMensuales?.cuentas) return 0;
        return datosMensuales.cuentas.reduce((sum, cuenta) => sum + (cuenta.saldo || 0), 0);
    }, [datosMensuales]);

    const esPeriodoActual = useMemo(() => {
        const hoy = new Date();
        return mesActual === hoy.getMonth() && anoActual === hoy.getFullYear();
    }, [mesActual, anoActual]);

    const obtenerColorCategoria = (nombreCategoria, tipo) => {
        const categorias = tipo === 'ingreso' ? categoriasIngreso : categoriasEgreso;
        const categoria = categorias.find(c => c.nombre === nombreCategoria);
        return categoria?.color || '#6b7280';
    };

    const obtenerIconoCategoria = (transaccion) => {
        const categorias = transaccion.tipo === 'ingreso' ? categoriasIngreso : categoriasEgreso;
        const cat = categorias.find(c => c.nombre === transaccion.categoria);
        // Priorizar icono de la categoría guardada en config, con fallback al campo icono/tipo de la transacción
        return cat?.icono || cat?.tipo || transaccion.icono || transaccion.tipo || 'ajuste';
    };

    const obtenerNombreCuenta = (cuentaId) => {
        if (!datosMensuales?.cuentas) return 'Cuenta';
        const cuenta = datosMensuales.cuentas.find(c => c.id === cuentaId);
        return cuenta?.nombre || 'Cuenta';
    };

    const manejarCambioMes = (mes) => {
        setMesActual(mes);
        setMostrarSelectorMes(false);
    };

    const manejarCambioAno = (direccion) => {
        setAnoActual(prev => direccion === 'prev' ? prev - 1 : prev + 1);
    };

    const manejarCambioMesFlechas = (direccion) => {
        if (direccion === 'prev') {
            if (mesActual === 0) {
                setMesActual(11);
                setAnoActual(prev => prev - 1);
            } else {
                setMesActual(prev => prev - 1);
            }
        } else {
            if (mesActual === 11) {
                setMesActual(0);
                setAnoActual(prev => prev + 1);
            } else {
                setMesActual(prev => prev + 1);
            }
        }
    };

    const tiposOpciones = [
        { id: 'todos', nombre: 'Transacciones' },
        { id: 'egreso', nombre: 'Gastos' },
        { id: 'ingreso', nombre: 'Ingresos' }
    ];

    const todasCategorias = [...categoriasIngreso, ...categoriasEgreso];

    const manejarClickTransaccion = (transaccion) => {
        setTransaccionSeleccionada(transaccion);
        setMostrarModalEditar(true);
    };

    const cerrarModalEditar = () => {
        setMostrarModalEditar(false);
        setTransaccionSeleccionada(null);
    };

    return (
        <div className="transacciones-page">
            {/* Selector de mes */}
            {mostrarSelectorMes && (
                <>
                    <div
                        className="modal-overlay"
                        onClick={() => setMostrarSelectorMes(false)}
                    />
                    <div className="month-selector-popup">
                        <div className="selector-mes-header">
                            <h3>Seleccionar período</h3>
                            <h2>{mesesCompletos[mesActual]} de {anoActual}</h2>
                        </div>

                        <div className="year-selector">
                            <button onClick={() => manejarCambioAno('prev')}>
                                <ChevronLeft size={28} strokeWidth={2.5} />
                            </button>
                            <span className="current-year">{anoActual}</span>
                            <button onClick={() => manejarCambioAno('next')}>
                                <ChevronRight size={28} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="month-grid">
                            {meses.map((mes, index) => (
                                <button
                                    key={index}
                                    className={`month-button ${mesActual === index ? 'month-button-selected' : ''}`}
                                    onClick={() => manejarCambioMes(index)}
                                >
                                    {mes}
                                </button>
                            ))}
                        </div>

                        <div className="month-actions">
                            <button className="cancel-btn" onClick={() => setMostrarSelectorMes(false)}>
                                CANCELAR
                            </button>
                            <button className="current-btn" onClick={() => {
                                setMesActual(new Date().getMonth());
                                setAnoActual(new Date().getFullYear());
                                setMostrarSelectorMes(false);
                            }}>
                                MES ACTUAL
                            </button>
                        </div>
                    </div>
                </>
            )}

            <div className="transacciones-container">
                {/* Barra de herramientas */}
                <div className="transacciones-toolbar">
                    {/* Desplegable de tipo */}
                    <div className="tipo-selector-wrapper">
                        <button
                            className="tipo-selector-btn"
                            onClick={() => setMostrarDesplegableTipo(!mostrarDesplegableTipo)}
                        >
                            <span>{tiposOpciones.find(t => t.id === tipoSeleccionado)?.nombre}</span>
                            <ChevronDown size={18} />
                        </button>

                        {mostrarDesplegableTipo && (
                            <>
                                <div
                                    className="dropdown-overlay"
                                    onClick={() => setMostrarDesplegableTipo(false)}
                                />
                                <div className="tipo-dropdown">
                                    {tiposOpciones.map(tipo => (
                                        <div
                                            key={tipo.id}
                                            className={`tipo-option ${tipoSeleccionado === tipo.id ? 'tipo-option-active' : ''}`}
                                            onClick={() => {
                                                setTipoSeleccionado(tipo.id);
                                                setMostrarDesplegableTipo(false);
                                            }}
                                        >
                                            <div
                                                className="tipo-indicator"
                                                style={{
                                                    background: tipo.id === 'todos'
                                                        ? '#8b5cf6'
                                                        : tipo.id === 'egreso'
                                                            ? '#ef4444'
                                                            : '#22c55e'
                                                }}
                                            />
                                            <span>{tipo.nombre}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="toolbar-actions">
                        {/* Búsqueda */}
                        {mostrarBusqueda ? (
                            <div className="search-input-wrapper">
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Buscar por descripción..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    autoFocus
                                    onBlur={() => {
                                        if (!busqueda.trim()) {
                                            setMostrarBusqueda(false);
                                        }
                                    }}
                                />
                            </div>
                        ) : (
                            <button
                                className="toolbar-icon-btn"
                                onClick={() => setMostrarBusqueda(true)}
                            >
                                <Search size={20} />
                            </button>
                        )}

                        {/* Filtro */}
                        <div style={{ position: 'relative' }}>
                            <button
                                className={`toolbar-icon-btn ${categoriaFiltro ? 'toolbar-icon-btn-active' : ''}`}
                                onClick={() => setMostrarFiltroCategoria(!mostrarFiltroCategoria)}
                            >
                                <Filter size={20} />
                            </button>

                            {mostrarFiltroCategoria && (
                                <>
                                    <div
                                        className="dropdown-overlay"
                                        onClick={() => setMostrarFiltroCategoria(false)}
                                    />
                                    <div className="filtro-categoria-dropdown">
                                        <div className="filtro-categoria-header">
                                            <span>Filtrar por categoría</span>
                                            {categoriaFiltro && (
                                                <button
                                                    className="filtro-limpiar-btn"
                                                    onClick={() => {
                                                        setCategoriaFiltro(null);
                                                        setMostrarFiltroCategoria(false);
                                                    }}
                                                >
                                                    Limpiar
                                                </button>
                                            )}
                                        </div>
                                        <div className="filtro-categoria-lista">
                                            {todasCategorias.map(categoria => (
                                                <div
                                                    key={categoria.id}
                                                    className={`filtro-categoria-item ${categoriaFiltro === categoria.nombre ? 'filtro-categoria-item-active' : ''}`}
                                                    onClick={() => {
                                                        setCategoriaFiltro(categoria.nombre);
                                                        setMostrarFiltroCategoria(false);
                                                    }}
                                                >
                                                    <div
                                                        className="filtro-categoria-color"
                                                        style={{ background: categoria.color }}
                                                    />
                                                    <span>{categoria.nombre}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <button className="toolbar-icon-btn">
                            <MoreHorizontal size={20} />
                        </button>
                    </div>
                </div>

                {/* Navegador de mes */}
                <div className="mes-navegador">
                    <button
                        className="mes-nav-btn"
                        onClick={() => manejarCambioMesFlechas('prev')}
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <button
                        className="mes-actual-btn"
                        onClick={() => setMostrarSelectorMes(true)}
                    >
                        {mesesCompletos[mesActual]}
                    </button>

                    <button
                        className="mes-nav-btn"
                        onClick={() => manejarCambioMesFlechas('next')}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Balance del mes */}
                <div className='contenedorgeneral'>
                    <div className="mes-balance-section">
                        <div className="balance-item">
                            <div className="balance-icon">
                                <Lock size={20} />
                            </div>
                            <div className="balance-content">
                                <p className="balance-label">{esPeriodoActual ? 'Saldo actual' : 'Saldo fin de mes'}</p>
                                <p className={`balance-value ${saldoTotal < 0 ? 'amount-negative' : saldoTotal > 0 ? 'amount-positive' : ''}`}>
                                    {formatearMoneda(saldoTotal)}
                                </p>
                            </div>
                        </div>
                        <div className="balance-item">
                            <div className="balance-icon">
                                <ArrowLeftRight size={20} />
                            </div>
                            <div className="balance-content">
                                <p className="balance-label">Balance mensual</p>
                                <p className={`balance-value ${balanceMensual < 0 ? 'amount-negative' : balanceMensual > 0 ? 'amount-positive' : ''}`}>
                                    {formatearMoneda(balanceMensual)}
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Linea separadora */}
                    <hr></hr>
                    {/* Lista de transacciones */}
                    <div className="transacciones-lista">
                        {transaccionesAgrupadas.length === 0 ? (
                            <div className="no-data-message">
                                <p>No hay transacciones</p>
                            </div>
                        ) : (
                            transaccionesAgrupadas.map(([fecha, grupo]) => (
                                <div key={fecha} className="transaccion-grupo">
                                    <h3 className="transaccion-fecha">{fecha}</h3>
                                    {grupo.transacciones.map((transaccion, index) => {
                                        const esTransferencia = transaccion.tipo === 'transferencia';
                                        const colorCategoria = esTransferencia
                                            ? '#6b7280'
                                            : obtenerColorCategoria(transaccion.categoria, transaccion.tipo);
                                        const nombreCuenta = obtenerNombreCuenta(transaccion.cuentaId);
                                        const cuentaOrigenNombre = obtenerNombreCuenta(transaccion.cuentaOrigenId);
                                        const cuentaDestinoNombre = obtenerNombreCuenta(transaccion.cuentaDestinoId);

                                        return (
                                            <div 
                                                key={index} 
                                                className="transaccion-item"
                                                onClick={() => manejarClickTransaccion(transaccion)}
                                            >
                                                <div className="transaccion-icono" style={{ background: colorCategoria }}>
                                                    {esTransferencia
                                                        ? <ArrowLeftRight size={16} color="white" />
                                                        : <IconoCategoria tipo={obtenerIconoCategoria(transaccion)} />
                                                    }
                                                </div>
                                                <div className="transaccion-info">
                                                    <h4 className="transaccion-descripcion">
                                                        {esTransferencia
                                                            ? (transaccion.descripcion || 'Transferencia')
                                                            : (transaccion.descripcion || transaccion.categoria)}
                                                    </h4>
                                                    <p className="transaccion-detalles">
                                                        {esTransferencia
                                                            ? `Transferencia | ${cuentaOrigenNombre} > ${cuentaDestinoNombre}`
                                                            : `${transaccion.categoria} | ${nombreCuenta}`}
                                                    </p>
                                                </div>
                                                <div className={`transaccion-monto ${esTransferencia ? '' : (transaccion.tipo === 'ingreso' ? 'amount-positive' : 'amount-negative')}`}>
                                                    {esTransferencia ? '' : (transaccion.tipo === 'ingreso' ? '+' : '-')}
                                                    {formatearMoneda(Math.abs(transaccion.monto))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de edición */}
            {mostrarModalEditar && transaccionSeleccionada && (
                <ModalMovimiento
                    tipo={transaccionSeleccionada.tipo}
                    mostrar={mostrarModalEditar}
                    cerrar={cerrarModalEditar}
                    cuentas={datosMensuales?.cuentas || []}
                    mesActual={mesActual}
                    anoActual={anoActual}
                    transaccionEditar={transaccionSeleccionada}
                />
            )}

            <NavegacionInferior
                tabActiva="transacciones"
                cuentas={datosMensuales?.cuentas || []}
                mesActual={mesActual}
                anoActual={anoActual}
            />
        </div>
    );
}

export default Transacciones;
