import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contextos/AuthContext';
import { useDatosMensuales, useCategorias } from '../hooks/useFirestore';
import { ChevronDown, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, CreditCard, Wallet, LogOut } from 'lucide-react';
import NavegacionInferior from './NavegacionInferior';
import Logo from './Logo';
import { PieChart as GraficoPastel, Pie, Cell, ResponsiveContainer } from 'recharts';

function PanelPrincipal() {
    const navigate = useNavigate();
    const { usuarioActual, cerrarSesion } = useAuth();
    const [mesActual, setMesActual] = useState(new Date().getMonth());
    const [anoActual, setAnoActual] = useState(new Date().getFullYear());
    const [mostrarSelectorMes, setMostrarSelectorMes] = useState(false);

    // Cargar datos desde Firestore en tiempo real
    const { datos: datosMensuales, cargando } = useDatosMensuales(
        usuarioActual?.uid,
        mesActual,
        anoActual
    );

    // Cargar categorías de egresos para obtener colores reales
    const { categorias: categoriasEgresos } = useCategorias(usuarioActual?.uid, 'egreso');

    const meses = [
        'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
        'JUL', 'AGO', 'SEPT', 'OCT', 'NOV', 'DIC'
    ];

    const mesesCompletos = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Calcular categorías para el gráfico desde transacciones de egresos
    const categorias = useMemo(() => {
        if (!datosMensuales?.transacciones || datosMensuales.transacciones.length === 0) {
            return [];
        }

        // Filtrar solo egresos
        const egresos = datosMensuales.transacciones.filter(t => t.tipo === 'egreso');
        
        if (egresos.length === 0) {
            return [];
        }

        // Crear un mapa de colores desde categoriasEgresos
        const mapaColores = {};
        if (categoriasEgresos && categoriasEgresos.length > 0) {
            categoriasEgresos.forEach(cat => {
                mapaColores[cat.nombre] = cat.color;
            });
        }

        // Agrupar por categoría
        const categoriasPorNombre = {};
        egresos.forEach(egreso => {
            const nombreCat = egreso.categoria || 'Sin categoría';
            if (!categoriasPorNombre[nombreCat]) {
                // Buscar color en categoriasEgresos, luego en egreso.color, o usar default
                const colorReal = mapaColores[nombreCat] || egreso.color || '#6b7280';
                categoriasPorNombre[nombreCat] = {
                    nombre: nombreCat,
                    monto: 0,
                    color: colorReal
                };
            }
            categoriasPorNombre[nombreCat].monto += egreso.monto;
        });

        const categoriasArray = Object.values(categoriasPorNombre);
        const total = categoriasArray.reduce((sum, cat) => sum + cat.monto, 0);
        
        return categoriasArray.map(cat => ({
            ...cat,
            porcentaje: total > 0 ? (cat.monto / total) * 100 : 0
        }));
    }, [datosMensuales, categoriasEgresos]);

    // Detectar si es el período actual
    const esPeriodoActual = useMemo(() => {
        const ahora = new Date();
        return ahora.getMonth() === mesActual && ahora.getFullYear() === anoActual;
    }, [mesActual, anoActual]);

    // Calcular saldos por tipo de cuenta (valores finales, ya incluyen todo)
    const saldosPorTipo = useMemo(() => {
        const cuentas = datosMensuales?.cuentas || [];
        
        const saldoDebito = cuentas
            .filter(cuenta => cuenta.tipo === 'debit')
            .reduce((sum, cuenta) => sum + (cuenta.saldo || 0), 0);
        
        const saldoEfectivo = cuentas
            .filter(cuenta => cuenta.tipo === 'cash')
            .reduce((sum, cuenta) => sum + (cuenta.saldo || 0), 0);
        
        const saldoInversiones = cuentas
            .filter(cuenta => cuenta.tipo === 'investments')
            .reduce((sum, cuenta) => sum + (cuenta.saldo || 0), 0);
        
        const saldoCuentas = saldoDebito + saldoEfectivo;
        const saldoTotal = saldoCuentas + saldoInversiones;
        
        return { saldoDebito, saldoEfectivo, saldoInversiones, saldoCuentas, saldoTotal };
    }, [datosMensuales]);

    const saldoTotal = saldosPorTipo.saldoTotal;

    // Calcular movimientos del mes por tipo (EXCLUYENDO transferencias para no duplicar)
    const movimientosPorTipo = useMemo(() => {
        const transacciones = datosMensuales?.transacciones || [];
        const cuentas = datosMensuales?.cuentas || [];
        
        const cuentasDebito = new Set(cuentas.filter(c => c.tipo === 'debit').map(c => c.id));
        const cuentasEfectivo = new Set(cuentas.filter(c => c.tipo === 'cash').map(c => c.id));
        const cuentasInversiones = new Set(cuentas.filter(c => c.tipo === 'investments').map(c => c.id));
        
        const resultado = {
            cuentas: { ingresos: 0, egresos: 0 },
            inversiones: { ingresos: 0, egresos: 0 },
            total: { ingresos: 0, egresos: 0 }
        };
        
        transacciones.forEach(t => {
            // Saltar transferencias para no duplicar en los totales
            if (t.tipo === 'transferencia') return;
            
            if (t.tipo === 'ingreso') {
                if (cuentasDebito.has(t.cuentaId) || cuentasEfectivo.has(t.cuentaId)) {
                    resultado.cuentas.ingresos += t.monto;
                } else if (cuentasInversiones.has(t.cuentaId)) {
                    resultado.inversiones.ingresos += t.monto;
                }
                resultado.total.ingresos += t.monto;
            } else if (t.tipo === 'egreso') {
                if (cuentasDebito.has(t.cuentaId) || cuentasEfectivo.has(t.cuentaId)) {
                    resultado.cuentas.egresos += t.monto;
                } else if (cuentasInversiones.has(t.cuentaId)) {
                    resultado.inversiones.egresos += t.monto;
                }
                resultado.total.egresos += t.monto;
            }
        });
        
        return resultado;
    }, [datosMensuales]);

    const netosResumen = useMemo(() => ({
        cuentas: movimientosPorTipo.cuentas.ingresos - movimientosPorTipo.cuentas.egresos,
        inversiones: movimientosPorTipo.inversiones.ingresos - movimientosPorTipo.inversiones.egresos,
        total: movimientosPorTipo.total.ingresos - movimientosPorTipo.total.egresos,
    }), [movimientosPorTipo]);

    const formatearMoneda = (monto) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2,
        }).format(monto);
    };

    const obtenerIconoCuenta = (tipo) => {
        switch (tipo) {
            case 'debit': return <CreditCard size={24} color="white" />;
            case 'cash': return <Wallet size={24} color="white" />;
            case 'investments': return <TrendingUp size={24} color="white" />;
            default: return <Wallet size={24} color="white" />;
        }
    };

    const manejarCambioMes = (mes) => {
        setMesActual(mes);
        setMostrarSelectorMes(false);
    };

    const manejarCambioAno = (direccion) => {
        setAnoActual(prev => direccion === 'prev' ? prev - 1 : prev + 1);
    };

    return (
        <div className="dashboard">
            <header className="header">
                <div className="header-logo">
                    <Logo size={50} />
                </div>

                <div className="month-selector" onClick={() => setMostrarSelectorMes(!mostrarSelectorMes)}>
                    <span className="month-selector-text">
                        {mesesCompletos[mesActual]}
                    </span>
                    <ChevronDown size={20} />
                </div>

                <button
                    onClick={async () => {
                        await cerrarSesion();
                        window.location.href = '/';
                    }}
                    className="logout-button"
                >
                    <LogOut size={20} />
                </button>
            </header>

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

                        <div className="months-grid">
                            {meses.map((mes, index) => (
                                <button
                                    key={index}
                                    className={`month-button ${index === mesActual ? 'active' : ''}`}
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

            <div className="balance-income-grid">
                <section className="balance-section">
                    <p className="balance-label">
                        {esPeriodoActual ? 'Saldo en las cuentas' : 'Saldo fin de mes'}
                    </p>
                    <h1 className={`balance-amount ${saldoTotal < 0 ? 'amount-negative' : saldoTotal > 0 ? 'amount-positive' : ''}`}>
                        {formatearMoneda(saldoTotal)}
                    </h1>
                </section>

                <section className="income-expense-inline">
                    <div className="income">
                        <div className="income-icon">
                            <TrendingUp size={24} color="white" />
                        </div>
                        <div>
                            <p className="income-expense-label">Ingresos</p>
                            <p className="income-amount amount-positive">
                                {formatearMoneda(datosMensuales?.ingresoTotal || 0)}
                            </p>
                        </div>
                    </div>

                    <div className="expense">
                        <div className="expense-icon">
                            <TrendingDown size={24} color="white" />
                        </div>
                        <div>
                            <p className="income-expense-label">Gastos</p>
                            <p className="expense-amount amount-negative">
                                {formatearMoneda(datosMensuales?.gastosTotal || 0)}
                            </p>
                        </div>
                    </div>
                </section>
            </div>

            <div className="main-content-grid">
                <section className="accounts-section">
                    <div className="section-title-wrapper">
                        <h3 className="section-title">{esPeriodoActual ? 'Cuentas' : 'Cuentas del mes'}</h3>
                        <span className="section-total">{formatearMoneda(saldoTotal)}</span>
                    </div>

                    {(datosMensuales?.cuentas && datosMensuales.cuentas.length > 0) ? (
                        datosMensuales.cuentas.map((cuenta) => (
                            <div key={cuenta.id} className="account-card">
                                <div className="account-info">
                                    <div className={`account-icon ${cuenta.tipo}`}>
                                        {obtenerIconoCuenta(cuenta.tipo)}
                                    </div>
                                    <div>
                                        <h4 className="account-name">{cuenta.nombre}</h4>
                                        <p className={`account-balance ${cuenta.saldo < 0 ? 'amount-negative' : cuenta.saldo > 0 ? 'amount-positive' : ''}`}>
                                            {formatearMoneda(cuenta.saldo)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-data-message">
                            <p>No hay datos cargados</p>
                        </div>
                    )}
                </section>

                <section className="expenses-chart">
                    <h3 className="section-title">
                        Resumen por categorías
                    </h3>

                    {(categorias && categorias.length > 0 && categorias.some(cat => cat.monto > 0)) ? (
                        <div className="chart-container">
                            <ResponsiveContainer width="40%" height={120}>
                                <GraficoPastel>
                                    <Pie
                                        data={categorias}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={30}
                                        outerRadius={50}
                                        paddingAngle={5}
                                        dataKey="monto"
                                    >
                                        {categorias.map((entrada, index) => (
                                            <Cell key={`cell-${index}`} fill={entrada.color} />
                                        ))}
                                    </Pie>
                                </GraficoPastel>
                            </ResponsiveContainer>

                            <div className="chart-legend">
                                {categorias.map((categoria, index) => (
                                    <div key={index} className="legend-item">
                                        <div className="legend-item-left">
                                            <div
                                                className="legend-color"
                                                style={{ background: categoria.color }}
                                            />
                                            <span className="legend-name">
                                                {categoria.nombre}
                                            </span>
                                        </div>
                                        <span className="legend-amount">
                                            {formatearMoneda(categoria.monto)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="no-data-message">
                            <p>No hay datos cargados</p>
                        </div>
                    )}

                    <div className="resumen-real-sin-inversiones">
                        <p className="resumen-real-titulo">Resumen</p>
                        <div className="resumen-real-grid-3">
                            <div className="resumen-real-columna">
                                <span className="resumen-real-label">Cuentas</span>
                                <div className="resumen-real-subfila">
                                    <span>Ingreso</span>
                                    <span className="amount-positive">{formatearMoneda(movimientosPorTipo.cuentas.ingresos)}</span>
                                </div>
                                <div className="resumen-real-subfila">
                                    <span>Egreso</span>
                                    <span className="amount-negative">{formatearMoneda(movimientosPorTipo.cuentas.egresos)}</span>
                                </div>
                                <span className={netosResumen.cuentas >= 0 ? 'amount-positive' : 'amount-negative'}>
                                    {formatearMoneda(netosResumen.cuentas)}
                                </span>
                            </div>

                            <div className="resumen-real-columna">
                                <span className="resumen-real-label">Inversiones</span>
                                <div className="resumen-real-subfila">
                                    <span>Ingreso</span>
                                    <span className="amount-positive">{formatearMoneda(movimientosPorTipo.inversiones.ingresos)}</span>
                                </div>
                                <div className="resumen-real-subfila">
                                    <span>Egreso</span>
                                    <span className="amount-negative">{formatearMoneda(movimientosPorTipo.inversiones.egresos)}</span>
                                </div>
                                <span className={netosResumen.inversiones >= 0 ? 'amount-positive' : 'amount-negative'}>
                                    {formatearMoneda(netosResumen.inversiones)}
                                </span>
                            </div>

                            <div className="resumen-real-columna">
                                <span className="resumen-real-label">Total</span>
                                <div className="resumen-real-subfila">
                                    <span>Ingreso</span>
                                    <span className="amount-positive">{formatearMoneda(movimientosPorTipo.total.ingresos)}</span>
                                </div>
                                <div className="resumen-real-subfila">
                                    <span>Egreso</span>
                                    <span className="amount-negative">{formatearMoneda(movimientosPorTipo.total.egresos)}</span>
                                </div>
                                <span className={netosResumen.total >= 0 ? 'amount-positive' : 'amount-negative'}>
                                    {formatearMoneda(netosResumen.total)}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <NavegacionInferior 
                tabActiva="principal" 
                cuentas={datosMensuales?.cuentas || []}
                mesActual={mesActual}
                anoActual={anoActual}
            />
        </div>
    );
}

export default PanelPrincipal;
