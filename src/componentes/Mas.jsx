import { useState } from 'react';
import { useAuth } from '../contextos/AuthContext';
import { useDatosMensuales } from '../hooks/useFirestore';
import NavegacionInferior from './NavegacionInferior';
import { Sparkles } from 'lucide-react';

function Mas() {
    const { usuarioActual } = useAuth();
    const fechaActual = new Date();
    const [mesActual] = useState(fechaActual.getMonth());
    const [anoActual] = useState(fechaActual.getFullYear());
    
    const { datosMensuales, cargando } = useDatosMensuales(usuarioActual?.uid, mesActual, anoActual);

    if (cargando) {
        return (
            <div className="mas-container">
                <div className="loading">Cargando...</div>
                <NavegacionInferior 
                    tabActiva="mas"
                    cuentas={[]}
                    mesActual={mesActual}
                    anoActual={anoActual}
                />
            </div>
        );
    }

    return (
        <div className="mas-container">
            <div className="proximamente-content">
                <div className="proximamente-icono">
                    <Sparkles size={80} strokeWidth={1.5} />
                </div>
                <h1 className="proximamente-titulo">Próximamente</h1>
                <p className="proximamente-descripcion">
                    Estamos trabajando en nuevas funcionalidades para Finanzas
                </p>
            </div>

            <NavegacionInferior 
                tabActiva="mas"
                cuentas={datosMensuales?.cuentas || []}
                mesActual={mesActual}
                anoActual={anoActual}
            />
        </div>
    );
}

export default Mas;
