import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Portada from './componentes/Portada';
import PantallaAuth from './componentes/PantallaAuth';
import PanelPrincipal from './componentes/PanelPrincipal';
import Transacciones from './componentes/Transacciones';
import Planificacion from './componentes/Planificacion';
import Mas from './componentes/Mas';
import ListadoSuper from './componentes/ListadoSuper';
import Tareas from './componentes/Tareas';
import { ProveedorAuth } from './contextos/AuthContext';
import RutaProtegida from './componentes/RutaProtegida';

function App() {
    return (
        <ProveedorAuth>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <div className="app">
                    <Routes>
                        <Route path="/" element={<Portada />} />
                        <Route path="/finanzas/auth" element={<PantallaAuth />} />
                        <Route path="/finanzas" element={
                            <RutaProtegida>
                                <PanelPrincipal />
                            </RutaProtegida>
                        } />
                        <Route path="/transacciones" element={
                            <RutaProtegida>
                                <Transacciones />
                            </RutaProtegida>
                        } />
                        <Route path="/planificacion" element={
                            <RutaProtegida>
                                <Planificacion />
                            </RutaProtegida>
                        } />
                        <Route path="/mas" element={
                            <RutaProtegida>
                                <Mas />
                            </RutaProtegida>
                        } />
                        <Route path="/listado-super" element={<ListadoSuper />} />
                        <Route path="/tareas" element={<Tareas />} />
                    </Routes>
                </div>
            </Router>
        </ProveedorAuth>
    );
}

export default App;
