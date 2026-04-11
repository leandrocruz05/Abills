import { createContext, useContext, useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

const ContextoAuth = createContext();

export const useAuth = () => {
    const contexto = useContext(ContextoAuth);
    if (!contexto) {
        throw new Error('useAuth debe usarse dentro de un ProveedorAuth');
    }
    return contexto;
};

export function ProveedorAuth({ children }) {
    const [usuarioActual, setUsuarioActual] = useState(null);
    const [cargando, setCargando] = useState(true);

    const iniciarSesion = async (email, contrasena) => {
        try {
            await signInWithEmailAndPassword(auth, email, contrasena);
        } catch (error) {
            console.error('Error al iniciar sesión:', error);
            throw new Error(obtenerMensajeError(error));
        }
    };

    const registrar = async (email, contrasena) => {
        try {
            await createUserWithEmailAndPassword(auth, email, contrasena);
        } catch (error) {
            console.error('Error al registrar:', error);
            throw new Error(obtenerMensajeError(error));
        }
    };

    const cerrarSesion = async () => {
        await signOut(auth);
    };

    const obtenerMensajeError = (error) => {
        switch (error.code) {
            case 'auth/email-already-in-use':
                return 'Este email ya está registrado. Intenta iniciar sesión.';
            case 'auth/weak-password':
                return 'La contraseña debe tener al menos 6 caracteres.';
            case 'auth/invalid-email':
                return 'El formato del email no es válido.';
            case 'auth/user-not-found':
                return 'No existe una cuenta con este email. Regístrate para continuar.';
            case 'auth/wrong-password':
                return 'Contraseña incorrecta. Verifica tus datos.';
            case 'auth/too-many-requests':
                return 'Demasiados intentos fallidos. Intenta más tarde.';
            case 'auth/operation-not-allowed':
                return 'El servicio de autenticación no está disponible. Contacta al administrador.';
            case 'auth/invalid-credential':
                return 'Usuario o contraseña incorrectos.';
            case 'auth/user-disabled':
                return 'Esta cuenta ha sido deshabilitada.';
            case 'auth/network-request-failed':
                return 'Error de conexión. Verifica tu internet.';
            default:
                if (error.message?.includes('Firebase')) {
                    return 'Error en el servicio de autenticación. Intenta más tarde.';
                }
                return error.message || 'Error de autenticación. Intenta nuevamente.';
        }
    };

    useEffect(() => {
        const desuscribir = onAuthStateChanged(auth, (usuario) => {
            setUsuarioActual(usuario);
            setCargando(false);
        });

        return desuscribir;
    }, []);

    const valor = {
        usuarioActual,
        iniciarSesion,
        registrar,
        cerrarSesion,
        cargando,
    };

    return (
        <ContextoAuth.Provider value={valor}>
            {!cargando && children}
        </ContextoAuth.Provider>
    );
}
