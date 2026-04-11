import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BarChart3, Plus, Calendar, MoreHorizontal, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, X } from 'lucide-react';
import ModalTransferencia from './ModalTransferencia';
import ModalMovimiento from './ModalMovimiento';

function NavegacionInferior({ tabActiva, cuentas = [], mesActual, anoActual }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [mostrarMenuFlotante, setMostrarMenuFlotante] = useState(false);
    const [mostrarModalTransferencia, setMostrarModalTransferencia] = useState(false);
    const [mostrarModalIngreso, setMostrarModalIngreso] = useState(false);
    const [mostrarModalEgreso, setMostrarModalEgreso] = useState(false);

    const pestanas = [
        { id: 'principal', etiqueta: 'Principal', icono: Home, ruta: '/finanzas' },
        { id: 'transacciones', etiqueta: 'Transacciones', icono: BarChart3, ruta: '/transacciones' },
        { id: 'agregar', etiqueta: '', icono: Plus, ruta: '/agregar' },
        { id: 'planificacion', etiqueta: 'Planificación', icono: Calendar, ruta: '/planificacion' },
        { id: 'mas', etiqueta: 'Más', icono: MoreHorizontal, ruta: '/mas' },
    ];

    const opcionesFlotantes = [
        { id: 'transferencia', etiqueta: 'Transferencia', icono: ArrowLeftRight, color: '#8b5cf6' },
        { id: 'ingreso', etiqueta: 'Ingreso', icono: ArrowUpRight, color: '#22c55e' },
        { id: 'egreso', etiqueta: 'Egreso', icono: ArrowDownLeft, color: '#ef4444' },
    ];

    const manejarClickPestana = (pestana) => {
        if (pestana.id === 'agregar') {
            setMostrarMenuFlotante(prev => !prev);
            return;
        }
        navigate(pestana.ruta);
    };

    const manejarClickOpcionFlotante = (opcionId) => {
        setMostrarMenuFlotante(false);
        if (opcionId === 'transferencia') setMostrarModalTransferencia(true);
        else if (opcionId === 'ingreso') setMostrarModalIngreso(true);
        else if (opcionId === 'egreso') setMostrarModalEgreso(true);
    };

    return (
        <>
            {mostrarMenuFlotante && (
                <div
                    className="floating-menu-overlay"
                    onClick={() => setMostrarMenuFlotante(false)}
                />
            )}

            {mostrarMenuFlotante && (
                <div className="floating-menu-container">
                    {opcionesFlotantes.map((opcion, index) => {
                        const Icono = opcion.icono;
                        return (
                            <div
                                key={opcion.id}
                                className={`floating-menu-item floating-menu-item-${index + 1}`}
                                onClick={() => manejarClickOpcionFlotante(opcion.id)}
                            >
                                <button className="floating-menu-button">
                                    <Icono size={26} color={opcion.color} strokeWidth={2.5} />
                                </button>
                                <span className="floating-menu-label">{opcion.etiqueta}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            <nav className="bottom-nav">
                {pestanas.map((pestana) => {
                    const Icono = pestana.icono;
                    const estaActiva = location.pathname === pestana.ruta || tabActiva === pestana.id;

                    if (pestana.id === 'agregar') {
                        return (
                            <button
                                key={pestana.id}
                                className={`add-button ${mostrarMenuFlotante ? 'add-button-active' : ''}`}
                                onClick={() => manejarClickPestana(pestana)}
                            >
                                {mostrarMenuFlotante
                                    ? <X size={24} color="white" />
                                    : <Icono size={24} color="white" />}
                            </button>
                        );
                    }

                    return (
                        <div
                            key={pestana.id}
                            className={`nav-item ${estaActiva ? 'active' : ''}`}
                            onClick={() => manejarClickPestana(pestana)}
                        >
                            <Icono size={20} color={estaActiva ? 'white' : 'rgba(255, 255, 255, 0.6)'} />
                            <span className="nav-label">{pestana.etiqueta}</span>
                        </div>
                    );
                })}
            </nav>

            {mostrarModalTransferencia && (
                <ModalTransferencia
                    cerrar={() => setMostrarModalTransferencia(false)}
                    cuentas={cuentas}
                    mesActual={mesActual}
                    anoActual={anoActual}
                />
            )}

            {mostrarModalIngreso && (
                <ModalMovimiento
                    tipo="ingreso"
                    cerrar={() => setMostrarModalIngreso(false)}
                    cuentas={cuentas}
                    mesActual={mesActual}
                    anoActual={anoActual}
                />
            )}

            {mostrarModalEgreso && (
                <ModalMovimiento
                    tipo="egreso"
                    cerrar={() => setMostrarModalEgreso(false)}
                    cuentas={cuentas}
                    mesActual={mesActual}
                    anoActual={anoActual}
                />
            )}
        </>
    );
}

export default NavegacionInferior;
