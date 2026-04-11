import { useNavigate } from 'react-router-dom';
import { TrendingUp, CheckSquare, ShoppingCart } from 'lucide-react';
import Logo from './Logo';

function Portada() {
    const navigate = useNavigate();

    return (
        <div className="landing-page">
            <div className="landing-content">
                <div className="landing-header">
                    <Logo size={70} />
                    <h1 className="landing-title">¡Bienvenido!</h1>
                    <p className="landing-subtitle">Selecciona la herramienta que deseas utilizar</p>
                </div>

                <div className="tools-grid">
                    <div
                        className="tool-card tool-finanzas"
                        onClick={() => navigate('/finanzas/auth')}
                    >
                        <div className="tool-icon tool-icon-finanzas">
                            <TrendingUp size={40} strokeWidth={2.5} />
                        </div>
                        <h2 className="tool-title">Finanzas</h2>
                        <p className="tool-description">
                            Gestiona ingresos, gastos y planificación financiera personal
                        </p>
                        <div className="tool-arrow">→</div>
                    </div>

                    <div
                        className="tool-card tool-tareas"
                        onClick={() => navigate('/tareas')}
                    >
                        <div className="tool-icon tool-icon-tareas">
                            <CheckSquare size={40} strokeWidth={2.5} />
                        </div>
                        <h2 className="tool-title">Tareas</h2>
                        <p className="tool-description">
                            Organiza listas y planifica la semana con tu equipo
                        </p>
                        <div className="tool-arrow">→</div>
                    </div>

                    <div
                        className="tool-card tool-super"
                        onClick={() => navigate('/listado-super')}
                    >
                        <div className="tool-icon tool-icon-super">
                            <ShoppingCart size={40} strokeWidth={2.5} />
                        </div>
                        <h2 className="tool-title">Super</h2>
                        <p className="tool-description">
                            Gestión de inventario y lista de compras inteligente
                        </p>
                        <div className="tool-arrow">→</div>
                    </div>
                </div>

                <footer className="landing-footer">
                    <p>© 2026 AbilLs. Todas tus herramientas en un solo lugar.</p>
                </footer>
            </div>
        </div>
    );
}

export default Portada;
