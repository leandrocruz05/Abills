import { useState, useEffect } from 'react';
import { useAuth } from '../contextos/AuthContext';
import { useAgregarTransferencia } from '../hooks/useFirestore';
import { X, ChevronLeft, ChevronRight, Delete, Calendar, CreditCard, Wallet, TrendingUp } from 'lucide-react';

function ModalTransferencia({ mostrar, alCerrar, cerrar, cuentas, mesActual, anoActual }) {
    const { usuarioActual } = useAuth();
    const { agregar, agregando } = useAgregarTransferencia();
    const [monto, setMonto] = useState('0,00');
    const [inputExpr, setInputExpr] = useState('0');
    const [mostrarTeclado, setMostrarTeclado] = useState(false);
    const [mostrarCalendario, setMostrarCalendario] = useState(false);
    const [mostrarSelectorCuenta, setMostrarSelectorCuenta] = useState(false);
    const [tipoCuentaSeleccionando, setTipoCuentaSeleccionando] = useState(null); // 'origen' o 'destino'

    const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
    const [periodoFecha, setPeriodoFecha] = useState('Hoy');
    const [cuentaOrigen, setCuentaOrigen] = useState(null);
    const [cuentaDestino, setCuentaDestino] = useState(null);
    const [observacion, setObservacion] = useState('');
    const [esTransferenciaFija, setEsTransferenciaFija] = useState(false);
    const [busquedaCuenta, setBusquedaCuenta] = useState('');

    const [mesCalendario, setMesCalendario] = useState(new Date().getMonth());
    const [anoCalendario, setAnoCalendario] = useState(new Date().getFullYear());

    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    if (typeof mostrar !== 'undefined' && !mostrar) return null;

    const cerrarModal = alCerrar || cerrar || (() => { });

    const manejarClickMonto = () => {
        setMostrarTeclado(true);
    };

    const formatNumber = (num) => {
        if (isNaN(num) || num === null) return monto;
        try {
            return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
        } catch (e) {
            return String(num);
        }
    };

    const safeEvaluate = (expr) => {
        try {
            // prevent unsafe characters
            if (/[^0-9.+\-*/()\s]/.test(expr)) return NaN;
            // eslint-disable-next-line no-new-func
            const fn = new Function('return ' + expr);
            const res = fn();
            return typeof res === 'number' && isFinite(res) ? res : NaN;
        } catch (e) {
            return NaN;
        }
    };

    const manejarTeclaNumero = (numero) => {
        setInputExpr(prev => {
            if (prev === '0') return String(numero);
            return prev + String(numero);
        });
    };

    const manejarTeclaComa = () => {
        setInputExpr(prev => {
            const match = prev.match(/(\d+\.?\d*)$/);
            if (!match) return prev + '0.';
            if (match[0].includes('.')) return prev;
            return prev + '.';
        });
    };

    const manejarBorrar = () => {
        setInputExpr(prev => {
            if (!prev || prev.length <= 1) return '0';
            return prev.slice(0, -1);
        });
    };

    const manejarOkTeclado = () => {
        // Evaluar la expresión y actualizar monto
        const expr = inputExpr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
        const val = safeEvaluate(expr);
        if (!isNaN(val)) {
            setMonto(formatNumber(val));
            setInputExpr(String(val));
        }
        setMostrarTeclado(false);
    };

    const manejarCancelarTeclado = () => {
        setInputExpr('0');
        setMonto('0,00');
        setMostrarTeclado(false);
    };

    const manejarOperador = (oper) => {
        setInputExpr(prev => {
            // Eliminar operador duplicado al final, luego agregar el nuevo
            if (/[+\-×÷*/]$/.test(prev)) {
                return prev.slice(0, -1) + oper;
            }
            return prev + oper;
        });
    };

    const manejarPorcentaje = () => {
        setInputExpr(prev => {
            const match = prev.match(/(\d+\.?\d*)$/);
            if (!match) return prev;
            const num = parseFloat(match[0]);
            const reemplazo = String(num / 100);
            return prev.slice(0, -match[0].length) + reemplazo;
        });
    };

    const manejarIgual = () => {
        const expr = inputExpr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
        const val = safeEvaluate(expr);
        if (!isNaN(val)) {
            setMonto(formatNumber(val));
            setInputExpr(String(val));
        }
    };

    // Vincula teclado físico con teclado en pantalla cuando está visible
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
    }, [mostrarTeclado, manejarOkTeclado, manejarIgual]);

    const manejarPeriodoFecha = (periodo) => {
        setPeriodoFecha(periodo);
        const hoy = new Date();
        const ayer = new Date(hoy);
        ayer.setDate(ayer.getDate() - 1);

        if (periodo === 'Hoy') {
            setFechaSeleccionada(hoy);
        } else if (periodo === 'Ayer') {
            setFechaSeleccionada(ayer);
        } else if (periodo === 'Otros...') {
            setMostrarCalendario(true);
        }
    };

    const manejarSeleccionFecha = (dia) => {
        const nuevaFecha = new Date(anoCalendario, mesCalendario, dia);
        setFechaSeleccionada(nuevaFecha);
        setMostrarCalendario(false);
        setPeriodoFecha('Otros...');
    };

    const manejarCambioMesCalendario = (direccion) => {
        if (direccion === 'prev') {
            if (mesCalendario === 0) {
                setMesCalendario(11);
                setAnoCalendario(anoCalendario - 1);
            } else {
                setMesCalendario(mesCalendario - 1);
            }
        } else {
            if (mesCalendario === 11) {
                setMesCalendario(0);
                setAnoCalendario(anoCalendario + 1);
            } else {
                setMesCalendario(mesCalendario + 1);
            }
        }
    };

    const obtenerDiasDelMes = () => {
        const primerDia = new Date(anoCalendario, mesCalendario, 1).getDay();
        const primerDiaAjustado = primerDia === 0 ? 6 : primerDia - 1; // Ajustar para lunes como primer día
        const ultimoDia = new Date(anoCalendario, mesCalendario + 1, 0).getDate();
        const dias = [];

        for (let i = 0; i < primerDiaAjustado; i++) {
            dias.push(null);
        }

        for (let i = 1; i <= ultimoDia; i++) {
            dias.push(i);
        }

        return dias;
    };

    const abrirSelectorCuenta = (tipo) => {
        setTipoCuentaSeleccionando(tipo);
        setMostrarSelectorCuenta(true);
    };

    const manejarSeleccionCuenta = (cuenta) => {
        if (tipoCuentaSeleccionando === 'origen') {
            setCuentaOrigen(cuenta);
        } else {
            setCuentaDestino(cuenta);
        }
        setMostrarSelectorCuenta(false);
        setBusquedaCuenta('');
    };

    const cuentasFiltradas = cuentas.filter(cuenta =>
        cuenta.nombre.toLowerCase().includes(busquedaCuenta.toLowerCase())
    );

    const manejarConfirmar = async () => {
        const valorNumerico = !isNaN(parseFloat(inputExpr)) ? safeEvaluate(inputExpr.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-')) : safeEvaluate(monto.replace(/\./g,'').replace(/,/g,'.'));
        
        if (!cuentaOrigen || !cuentaDestino) {
            alert('Por favor selecciona cuenta origen y destino');
            return;
        }

        if (cuentaOrigen.id === cuentaDestino.id) {
            alert('La cuenta origen y destino no pueden ser la misma');
            return;
        }

        // Usar mesActual y anoActual pasados por props o fecha seleccionada
        const fechaMes = fechaSeleccionada.getMonth();
        const fechaAno = fechaSeleccionada.getFullYear();

        const transferencia = {
            monto: valorNumerico,
            fecha: fechaSeleccionada.toISOString(),
            cuentaOrigenId: cuentaOrigen.id,
            cuentaDestinoId: cuentaDestino.id,
            descripcion: observacion || '',
            esFija: esTransferenciaFija
        };

        const exito = await agregar(usuarioActual?.uid, fechaMes, fechaAno, transferencia);

        if (exito) {
            console.log('Transferencia guardada exitosamente');
            cerrarModal();
        } else {
            alert('Error al guardar transferencia. Intenta nuevamente.');
        }
    };

    const fechaFormateada = fechaSeleccionada.toLocaleDateString('es-AR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
    });

    return (
        <>
            <div className="modal-overlay-transferencia" onClick={cerrarModal} />

            <div className="modal-transferencia">
                <div className="modal-transferencia-header">
                    <button className="btn-cerrar-modal" onClick={cerrarModal}>
                        <X size={24} />
                    </button>
                    <h2>Nueva transferencia</h2>
                </div>

                <div className="modal-transferencia-contenido">
                    {/* Monto */}
                    <div className="seccion-monto" onClick={manejarClickMonto}>
                        <p className="label-monto">Valor de la transferencia</p>
                        <h1 className="valor-monto">$ {monto}</h1>
                    </div>

                    {/* Selector de período */}
                    {periodoFecha !== 'Otros...' ? (
                        <div className="selector-periodo">
                            <button
                                className={`btn-periodo ${periodoFecha === 'Hoy' ? 'activo' : ''}`}
                                onClick={() => manejarPeriodoFecha('Hoy')}
                            >
                                Hoy
                            </button>
                            <button
                                className={`btn-periodo ${periodoFecha === 'Ayer' ? 'activo' : ''}`}
                                onClick={() => manejarPeriodoFecha('Ayer')}
                            >
                                Ayer
                            </button>
                            <button
                                className={`btn-periodo ${periodoFecha === 'Otros...' ? 'activo' : ''}`}
                                onClick={() => manejarPeriodoFecha('Otros...')}
                            >
                                Otros...
                            </button>
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

                    {/* Cuenta origen */}
                    <div className="seccion-cuenta" onClick={() => abrirSelectorCuenta('origen')}>
                        <div className={`cuenta-icono-placeholder ${cuentaOrigen ? cuentaOrigen.tipo : ''}`}>
                            {cuentaOrigen ? (
                                <>
                                    {cuentaOrigen.tipo === 'debit' && <CreditCard size={20} color="white" />}
                                    {cuentaOrigen.tipo === 'cash' && <Wallet size={20} color="white" />}
                                    {cuentaOrigen.tipo === 'investments' && <TrendingUp size={20} color="white" />}
                                </>
                            ) : (
                                <Wallet size={20} color="rgba(255,255,255,0.6)" />
                            )}
                        </div>
                        <div className="cuenta-info-selector">
                            <span className="cuenta-label">De la cuenta</span>
                            {cuentaOrigen && <span className="cuenta-nombre-seleccionada">{cuentaOrigen.nombre}</span>}
                        </div>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                            <path d="M7 10l5 5 5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>

                    {/* Transferir a */}
                    <div className="seccion-transferir-a">
                        <span className="label-transferir">Transferir a</span>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                            <path d="M10 5v10M5 10l5 5 5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>

                    {/* Cuenta destino */}
                    <div className="seccion-cuenta" onClick={() => abrirSelectorCuenta('destino')}>
                        <div className={`cuenta-icono-placeholder ${cuentaDestino ? cuentaDestino.tipo : ''}`}>
                            {cuentaDestino ? (
                                <>
                                    {cuentaDestino.tipo === 'debit' && <CreditCard size={20} color="white" />}
                                    {cuentaDestino.tipo === 'cash' && <Wallet size={20} color="white" />}
                                    {cuentaDestino.tipo === 'investments' && <TrendingUp size={20} color="white" />}
                                </>
                            ) : (
                                <Wallet size={20} color="rgba(255,255,255,0.6)" />
                            )}
                        </div>
                        <div className="cuenta-info-selector">
                            <span className="cuenta-label">A la cuenta</span>
                            {cuentaDestino && <span className="cuenta-nombre-seleccionada">{cuentaDestino.nombre}</span>}
                        </div>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                            <path d="M7 10l5 5 5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>

                    {/* Observación */}
                    <div className="seccion-observacion">
                        <div className="observacion-icono">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                                <path d="M3 6h18M3 12h18M3 18h18" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="input-observacion"
                            placeholder="Observación"
                            value={observacion}
                            onChange={(e) => setObservacion(e.target.value)}
                        />
                    </div>
                </div>

                <button 
                    className="btn-confirmar-transferencia" 
                    onClick={manejarConfirmar}
                    disabled={agregando}
                    style={{ opacity: agregando ? 0.6 : 1 }}
                >
                    {agregando ? (
                        <svg className="spinner" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <circle cx="12" cy="12" r="10" opacity="0.25" />
                            <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round" />
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    )}
                </button>
            </div>

            {/* Teclado numérico */}
            {mostrarTeclado && (
                <>
                    <div className="modal-overlay-teclado" onClick={manejarCancelarTeclado} />
                    <div className="teclado-numerico">
                        <div className="teclado-display">
                            <span className="teclado-simbolo">$</span>
                            <span className="teclado-valor">{inputExpr}</span>
                            <button className="teclado-borrar" onClick={manejarBorrar}>
                                <Delete size={20} />
                            </button>
                        </div>

                        <div className="teclado-botones">
                            <button onClick={() => manejarTeclaNumero(7)}>7</button>
                            <button onClick={() => manejarTeclaNumero(8)}>8</button>
                            <button onClick={() => manejarTeclaNumero(9)}>9</button>
                            <button className="teclado-operador" onClick={() => manejarOperador('÷')}>÷</button>

                            <button onClick={() => manejarTeclaNumero(4)}>4</button>
                            <button onClick={() => manejarTeclaNumero(5)}>5</button>
                            <button onClick={() => manejarTeclaNumero(6)}>6</button>
                            <button className="teclado-operador" onClick={() => manejarOperador('×')}>×</button>

                            <button onClick={() => manejarTeclaNumero(1)}>1</button>
                            <button onClick={() => manejarTeclaNumero(2)}>2</button>
                            <button onClick={() => manejarTeclaNumero(3)}>3</button>
                            <button className="teclado-operador" onClick={() => manejarOperador('−')}>−</button>

                            <button onClick={manejarPorcentaje}>%</button>
                            <button onClick={() => manejarTeclaNumero(0)}>0</button>
                            <button onClick={manejarTeclaComa}>.</button>
                            <button className="teclado-operador" onClick={() => manejarOperador('+')}>+</button>

                            <button className="teclado-igual" onClick={manejarIgual} style={{gridColumn: 'span 4'}}>=</button>
                        </div>

                        <div className="teclado-acciones">
                            <button className="btn-teclado-cancelar" onClick={manejarCancelarTeclado}>
                                CANCELAR
                            </button>
                            <button className="btn-teclado-ok" onClick={manejarOkTeclado}>
                                OK
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Calendario */}
            {mostrarCalendario && (
                <>
                    <div className="modal-overlay-calendario" onClick={() => setMostrarCalendario(false)} />
                    <div className="calendario-selector">
                        <div className="calendario-header">
                            <h3>{anoCalendario}</h3>
                            <h2>{fechaFormateada}</h2>
                        </div>

                        <div className="calendario-navegacion">
                            <button onClick={() => manejarCambioMesCalendario('prev')}>
                                <ChevronLeft size={20} strokeWidth={2.5} />
                            </button>
                            <span className="calendario-mes-actual">{meses[mesCalendario]} de {anoCalendario}</span>
                            <button onClick={() => manejarCambioMesCalendario('next')}>
                                <ChevronRight size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="calendario-dias-semana">
                            <span>L</span>
                            <span>M</span>
                            <span>X</span>
                            <span>J</span>
                            <span>V</span>
                            <span>S</span>
                            <span>D</span>
                        </div>

                        <div className="calendario-dias">
                            {obtenerDiasDelMes().map((dia, index) => (
                                <button
                                    key={index}
                                    className={`calendario-dia ${!dia ? 'vacio' : ''} ${dia === fechaSeleccionada.getDate() &&
                                        mesCalendario === fechaSeleccionada.getMonth() &&
                                        anoCalendario === fechaSeleccionada.getFullYear()
                                        ? 'activo'
                                        : ''
                                        }`}
                                    onClick={() => dia && manejarSeleccionFecha(dia)}
                                    disabled={!dia}
                                >
                                    {dia}
                                </button>
                            ))}
                        </div>

                        <div className="calendario-acciones">
                            <button className="btn-calendario-cancelar" onClick={() => setMostrarCalendario(false)}>
                                CANCELAR
                            </button>
                            <button className="btn-calendario-aceptar" onClick={() => setMostrarCalendario(false)}>
                                ACEPTAR
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Selector de cuentas */}
            {mostrarSelectorCuenta && (
                <>
                    <div className="modal-overlay-selector-cuenta" onClick={() => setMostrarSelectorCuenta(false)} />
                    <div className="selector-cuentas">
                        <div className="selector-cuentas-busqueda">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                                <circle cx="9" cy="9" r="6"></circle>
                                <path d="M14 14l4 4"></path>
                            </svg>
                            <input
                                type="text"
                                placeholder="Buscar cuenta"
                                value={busquedaCuenta}
                                onChange={(e) => setBusquedaCuenta(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="selector-cuentas-lista">
                            {cuentasFiltradas.map((cuenta) => (
                                <div
                                    key={cuenta.id}
                                    className={`selector-cuenta-item ${(cuentaOrigen?.id === cuenta.id || cuentaDestino?.id === cuenta.id) ? 'seleccionado' : ''}`}
                                    onClick={() => manejarSeleccionCuenta(cuenta)}
                                >
                                    <div className={`selector-cuenta-icono ${cuenta.tipo}`}>
                                        {cuenta.tipo === 'debit' && <CreditCard size={20} color="white" />}
                                        {cuenta.tipo === 'cash' && <Wallet size={20} color="white" />}
                                        {cuenta.tipo === 'investments' && <TrendingUp size={20} color="white" />}
                                    </div>
                                    <span className="selector-cuenta-nombre">{cuenta.nombre}</span>
                                    <div className="selector-cuenta-radio">
                                        <input type="radio" name="cuenta-seleccionada" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

export default ModalTransferencia;
