import { Navigate } from 'react-router-dom';
import { useAuth } from '../contextos/AuthContext';

function RutaProtegida({ children }) {
    const { usuarioActual } = useAuth();

    return usuarioActual ? children : <Navigate to="/finanzas/auth" />;
}

export default RutaProtegida;
