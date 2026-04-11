import { useState } from 'react';
import { useAuth } from '../contextos/AuthContext';
import { useNavigate } from 'react-router-dom';
import Logo from './Logo';

function PantallaAuth() {
    const [esInicioSesion, setEsInicioSesion] = useState(true);
    const [email, setEmail] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [confirmarContrasena, setConfirmarContrasena] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    const { iniciarSesion, registrar } = useAuth();
    const navigate = useNavigate();

    const manejarEnvio = async (e) => {
        e.preventDefault();

        if (!esInicioSesion && contrasena !== confirmarContrasena) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setError('');
        setCargando(true);

        try {
            if (esInicioSesion) {
                await iniciarSesion(email, contrasena);
            } else {
                await registrar(email, contrasena);
            }
            navigate('/finanzas');
        } catch (err) {
            setError(err.message || 'Error en la autenticación');
        }

        setCargando(false);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-logo">
                    <Logo size={80} />
                </div>

                <h2 className="auth-titulo">
                    {esInicioSesion ? 'Iniciar Sesión' : 'Registrarse'}
                </h2>

                {error && (
                    <div className="auth-error">
                        {error}
                    </div>
                )}

                <form onSubmit={manejarEnvio} className="auth-form">
                    <div className="form-group">
                        <label>Email:</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ejemplo@correo.com"
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Contraseña:</label>
                        <input
                            type="password"
                            value={contrasena}
                            onChange={(e) => setContrasena(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                        />
                    </div>

                    {!esInicioSesion && (
                        <div className="form-group">
                            <label>Confirmar Contraseña:</label>
                            <input
                                type="password"
                                value={confirmarContrasena}
                                onChange={(e) => setConfirmarContrasena(e.target.value)}
                                placeholder="••••••••"
                                autoComplete="new-password"
                                required
                            />
                        </div>
                    )}

                    <button type="submit" disabled={cargando}>
                        {cargando ? 'Cargando...' : (esInicioSesion ? 'Iniciar Sesión' : 'Registrarse')}
                    </button>
                </form>

                <p className="auth-cambiar">
                    {esInicioSesion ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                    <span
                        className="auth-cambiar-link"
                        onClick={() => setEsInicioSesion(!esInicioSesion)}
                    >
                        {esInicioSesion ? 'Regístrate' : 'Inicia Sesión'}
                    </span>
                </p>
            </div>
        </div>
    );
}

export default PantallaAuth;
