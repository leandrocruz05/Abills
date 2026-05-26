import { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
    crearConfigCategoriasDefault,
    normalizarCategoriaConfig,
    obtenerCategoriasDefaultPorTipo,
} from '../config/categoriasConfig';

const CUENTAS_DEFAULT = [
    { id: '1', nombre: 'Débito', tipo: 'debit', saldo: 0, icono: 'card' },
    { id: '2', nombre: 'Efectivo', tipo: 'cash', saldo: 0, icono: 'dollar' },
    { id: '3', nombre: 'Inversiones', tipo: 'investments', saldo: 0, icono: 'chart' }
];

const CATEGORIAS_DEFAULT = {
    Inversiones: 0,
    Pagos: 0,
    'Gastos Incidentales': 0
};

const obtenerDocIdPeriodo = (mes, ano) => `${ano}-${String(mes + 1).padStart(2, '0')}`;

const obtenerCuentasIniciales = async (userId, mes, ano) => {
    const docObjetivoId = obtenerDocIdPeriodo(mes, ano);
    const finanzasRef = collection(db, 'users', userId, 'finanzas');
    const snapshot = await getDocs(finanzasRef);

    let ultimoDocValido = null;

    snapshot.forEach((docSnap) => {
        const id = docSnap.id;
        if (id > docObjetivoId) return;

        const data = docSnap.data();
        if (!Array.isArray(data?.cuentas) || data.cuentas.length === 0) return;

        if (!ultimoDocValido || id > ultimoDocValido.id) {
            ultimoDocValido = { id, data };
        }
    });

    if (ultimoDocValido) {
        return ultimoDocValido.data.cuentas.map(cuenta => ({ ...cuenta }));
    }

    return CUENTAS_DEFAULT.map(cuenta => ({ ...cuenta }));
};

const obtenerCuentasMesAnterior = async (userId, mes, ano) => {
    const docObjetivoId = obtenerDocIdPeriodo(mes, ano);
    const finanzasRef = collection(db, 'users', userId, 'finanzas');
    const snapshot = await getDocs(finanzasRef);

    let ultimoDocValido = null;

    snapshot.forEach((docSnap) => {
        const id = docSnap.id;
        if (id >= docObjetivoId) return;

        const data = docSnap.data();
        if (!Array.isArray(data?.cuentas) || data.cuentas.length === 0) return;

        if (!ultimoDocValido || id > ultimoDocValido.id) {
            ultimoDocValido = { id, data };
        }
    });

    if (ultimoDocValido) {
        return ultimoDocValido.data.cuentas.map(cuenta => ({ ...cuenta }));
    }

    return CUENTAS_DEFAULT.map(cuenta => ({ ...cuenta }));
};

const recalcularDatosMes = (cuentasBase, transacciones, categoriasActuales = CATEGORIAS_DEFAULT) => {
    const cuentas = (cuentasBase || []).map(cuenta => ({
        ...cuenta,
        saldo: Number(cuenta.saldo) || 0,
    }));

    let ingresoTotal = 0;
    let gastosTotal = 0;

    const categorias = { ...(categoriasActuales || CATEGORIAS_DEFAULT) };
    Object.keys(categorias).forEach((key) => {
        categorias[key] = 0;
    });

    (transacciones || []).forEach((transaccion) => {
        const monto = Number(transaccion.monto) || 0;

        if (transaccion.tipo === 'ingreso') {
            ingresoTotal += monto;
            if (transaccion.cuentaId) {
                const cuentaIndex = cuentas.findIndex(c => c.id === transaccion.cuentaId);
                if (cuentaIndex >= 0) {
                    cuentas[cuentaIndex].saldo += monto;
                }
            }
        } else if (transaccion.tipo === 'egreso') {
            gastosTotal += monto;
            if (transaccion.cuentaId) {
                const cuentaIndex = cuentas.findIndex(c => c.id === transaccion.cuentaId);
                if (cuentaIndex >= 0) {
                    cuentas[cuentaIndex].saldo -= monto;
                }
            }
        } else if (transaccion.tipo === 'transferencia') {
            const cuentaOrigenIndex = cuentas.findIndex(c => c.id === transaccion.cuentaOrigenId);
            const cuentaDestinoIndex = cuentas.findIndex(c => c.id === transaccion.cuentaDestinoId);

            if (cuentaOrigenIndex >= 0) {
                cuentas[cuentaOrigenIndex].saldo -= monto;
            }
            if (cuentaDestinoIndex >= 0) {
                cuentas[cuentaDestinoIndex].saldo += monto;
            }
        }

        if (
            (transaccion.tipo === 'ingreso' || transaccion.tipo === 'egreso') &&
            transaccion.categoria &&
            categorias[transaccion.categoria] !== undefined
        ) {
            categorias[transaccion.categoria] += monto;
        }
    });

    return { cuentas, ingresoTotal, gastosTotal, categorias };
};

const normalizarSaldo = (valor) => Math.round((Number(valor) || 0) * 100) / 100;

const cuentasSonIguales = (cuentasA = [], cuentasB = []) => {
    if (cuentasA.length !== cuentasB.length) return false;

    const mapaB = new Map(cuentasB.map(cuenta => [cuenta.id, cuenta]));

    return cuentasA.every((cuentaA) => {
        const cuentaB = mapaB.get(cuentaA.id);
        if (!cuentaB) return false;
        return normalizarSaldo(cuentaA.saldo) === normalizarSaldo(cuentaB.saldo);
    });
};

const crearDatosInicialesMes = async (userId, mes, ano) => {
    const cuentasIniciales = await obtenerCuentasIniciales(userId, mes, ano);
    return {
        mes,
        ano,
        ingresoTotal: 0,
        gastosTotal: 0,
        cuentas: cuentasIniciales,
        transacciones: [],
        categorias: { ...CATEGORIAS_DEFAULT }
    };
};

/**
 * Hook para gestionar datos mensuales de finanzas del usuario
 * Estructura: users/{userId}/finanzas/{mesAño}
 */
export function useDatosMensuales(userId, mes, ano) {
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!userId) {
            setDatos(null);
            setCargando(false);
            return;
        }

        const docId = obtenerDocIdPeriodo(mes, ano);
        const docRef = doc(db, 'users', userId, 'finanzas', docId);

        // Listener en tiempo real
        const unsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    const datosDoc = docSnap.data();
                    setDatos({ id: docSnap.id, ...datosDoc });

                    // Auto-corrección: recalcula saldos/totales con base en mes anterior y transacciones.
                    (async () => {
                        try {
                            const cuentasBase = await obtenerCuentasMesAnterior(userId, mes, ano);
                            const recalculado = recalcularDatosMes(
                                cuentasBase,
                                datosDoc.transacciones || [],
                                datosDoc.categorias || CATEGORIAS_DEFAULT
                            );

                            const requiereActualizacion =
                                !cuentasSonIguales(datosDoc.cuentas || [], recalculado.cuentas) ||
                                normalizarSaldo(datosDoc.ingresoTotal) !== normalizarSaldo(recalculado.ingresoTotal) ||
                                normalizarSaldo(datosDoc.gastosTotal) !== normalizarSaldo(recalculado.gastosTotal);

                            if (requiereActualizacion) {
                                await setDoc(docRef, {
                                    mes,
                                    ano,
                                    cuentas: recalculado.cuentas,
                                    ingresoTotal: recalculado.ingresoTotal,
                                    gastosTotal: recalculado.gastosTotal,
                                    categorias: recalculado.categorias,
                                    actualizadoEn: new Date().toISOString()
                                }, { merge: true });
                            }
                        } catch (recalculoError) {
                            console.error('Error al recalcular saldos del mes:', recalculoError);
                        }
                    })();
                } else {
                    // Crear estructura inicial en memoria heredando saldos del mes anterior
                    (async () => {
                        const datosIniciales = await crearDatosInicialesMes(userId, mes, ano);
                        setDatos({ id: docId, ...datosIniciales });
                    })();
                }
                setCargando(false);
            },
            (err) => {
                console.error('Error al cargar datos mensuales:', err);
                setError(err);
                setCargando(false);
            }
        );

        return () => unsubscribe();
    }, [userId, mes, ano]);

    return { datos, cargando, error };
}

/**
 * Hook para guardar/actualizar datos mensuales
 */
export function useGuardarDatosMensuales() {
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    const guardar = async (userId, mes, ano, datos) => {
        if (!userId) {
            setError(new Error('Usuario no autenticado'));
            return false;
        }

        setGuardando(true);
        setError(null);

        try {
            const docId = obtenerDocIdPeriodo(mes, ano);
            const docRef = doc(db, 'users', userId, 'finanzas', docId);

            await setDoc(docRef, {
                ...datos,
                mes,
                ano,
                actualizadoEn: new Date().toISOString()
            }, { merge: true });

            setGuardando(false);
            return true;
        } catch (err) {
            console.error('Error al guardar datos:', err);
            setError(err);
            setGuardando(false);
            return false;
        }
    };

    return { guardar, guardando, error };
}

/**
 * Hook para agregar una transacción
 */
export function useAgregarTransaccion() {
    const [agregando, setAgregando] = useState(false);
    const [error, setError] = useState(null);

    const agregar = async (userId, mes, ano, transaccion) => {
        if (!userId) {
            setError(new Error('Usuario no autenticado'));
            return false;
        }

        setAgregando(true);
        setError(null);

        try {
            const docId = obtenerDocIdPeriodo(mes, ano);
            const docRef = doc(db, 'users', userId, 'finanzas', docId);

            // Obtener documento actual
            const docSnap = await getDoc(docRef);
            let datosActuales = {};

            if (docSnap.exists()) {
                datosActuales = docSnap.data();
            } else {
                // Crear estructura inicial heredando saldos del mes anterior
                datosActuales = await crearDatosInicialesMes(userId, mes, ano);
            }

            // Agregar nueva transacción
            const nuevaTransaccion = {
                ...transaccion,
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                fechaCreacion: new Date().toISOString()
            };

            const transacciones = [...(datosActuales.transacciones || []), nuevaTransaccion];
            const cuentasBase = await obtenerCuentasMesAnterior(userId, mes, ano);
            const { cuentas, ingresoTotal, gastosTotal, categorias } = recalcularDatosMes(
                cuentasBase,
                transacciones,
                datosActuales.categorias || CATEGORIAS_DEFAULT
            );

            await setDoc(docRef, {
                ...datosActuales,
                mes,
                ano,
                transacciones,
                ingresoTotal,
                gastosTotal,
                cuentas,
                categorias,
                actualizadoEn: new Date().toISOString()
            });

            setAgregando(false);
            return true;
        } catch (err) {
            console.error('Error al agregar transacción:', err);
            setError(err);
            setAgregando(false);
            return false;
        }
    };

    return { agregar, agregando, error };
}

/**
 * Hook para editar una transacción existente
 */
export function useEditarTransaccion() {
    const [editando, setEditando] = useState(false);
    const [error, setError] = useState(null);

    const editar = async (userId, mes, ano, transaccionId, transaccionActualizada) => {
        if (!userId) {
            setError(new Error('Usuario no autenticado'));
            return false;
        }

        setEditando(true);
        setError(null);

        try {
            const docId = obtenerDocIdPeriodo(mes, ano);
            const docRef = doc(db, 'users', userId, 'finanzas', docId);

            // Obtener documento actual
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                throw new Error('Documento no encontrado');
            }

            const datosActuales = docSnap.data();
            const transacciones = [...(datosActuales.transacciones || [])];
            
            // Encontrar la transacción original
            const indexOriginal = transacciones.findIndex(t => t.id === transaccionId);
            
            if (indexOriginal === -1) {
                throw new Error('Transacción no encontrada');
            }

            const transaccionOriginal = transacciones[indexOriginal];

            // Reemplazar la transacción en el array
            const transaccionEditada = {
                ...transaccionOriginal,
                ...transaccionActualizada,
                id: transaccionId, // Mantener el ID original
                fechaModificacion: new Date().toISOString()
            };

            transacciones[indexOriginal] = transaccionEditada;

            const cuentasBase = await obtenerCuentasMesAnterior(userId, mes, ano);
            const { cuentas, ingresoTotal, gastosTotal, categorias } = recalcularDatosMes(
                cuentasBase,
                transacciones,
                datosActuales.categorias || CATEGORIAS_DEFAULT
            );

            await setDoc(docRef, {
                ...datosActuales,
                mes,
                ano,
                transacciones,
                ingresoTotal,
                gastosTotal,
                cuentas,
                categorias,
                actualizadoEn: new Date().toISOString()
            });

            setEditando(false);
            return true;
        } catch (err) {
            console.error('Error al editar transacción:', err);
            setError(err);
            setEditando(false);
            return false;
        }
    };

    return { editar, editando, error };
}

/**
 * Hook para eliminar una transacción
 */
export function useEliminarTransaccion() {
    const [eliminando, setEliminando] = useState(false);
    const [error, setError] = useState(null);

    const eliminar = async (userId, mes, ano, transaccionId) => {
        if (!userId) {
            setError(new Error('Usuario no autenticado'));
            return false;
        }

        setEliminando(true);
        setError(null);

        try {
            const docId = obtenerDocIdPeriodo(mes, ano);
            const docRef = doc(db, 'users', userId, 'finanzas', docId);

            // Obtener documento actual
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                throw new Error('Documento no encontrado');
            }

            const datosActuales = docSnap.data();
            const transacciones = [...(datosActuales.transacciones || [])];
            
            // Encontrar la transacción a eliminar
            const indexTransaccion = transacciones.findIndex(t => t.id === transaccionId);
            
            if (indexTransaccion === -1) {
                throw new Error('Transacción no encontrada');
            }

            const transaccion = transacciones[indexTransaccion];

            // Eliminar la transacción del array
            transacciones.splice(indexTransaccion, 1);

            const cuentasBase = await obtenerCuentasMesAnterior(userId, mes, ano);
            const { cuentas, ingresoTotal, gastosTotal, categorias } = recalcularDatosMes(
                cuentasBase,
                transacciones,
                datosActuales.categorias || CATEGORIAS_DEFAULT
            );

            await setDoc(docRef, {
                ...datosActuales,
                mes,
                ano,
                transacciones,
                ingresoTotal,
                gastosTotal,
                cuentas,
                categorias,
                actualizadoEn: new Date().toISOString()
            });

            setEliminando(false);
            return true;
        } catch (err) {
            console.error('Error al eliminar transacción:', err);
            setError(err);
            setEliminando(false);
            return false;
        }
    };

    return { eliminar, eliminando, error };
}

/**
 * Hook para agregar una transferencia entre cuentas
 */
export function useAgregarTransferencia() {
    const [agregando, setAgregando] = useState(false);
    const [error, setError] = useState(null);

    const agregar = async (userId, mes, ano, transferencia) => {
        if (!userId) {
            setError(new Error('Usuario no autenticado'));
            return false;
        }

        setAgregando(true);
        setError(null);

        try {
            const docId = obtenerDocIdPeriodo(mes, ano);
            const docRef = doc(db, 'users', userId, 'finanzas', docId);

            const docSnap = await getDoc(docRef);
            let datosActuales = {};

            if (docSnap.exists()) {
                datosActuales = docSnap.data();
            } else {
                datosActuales = await crearDatosInicialesMes(userId, mes, ano);
            }

            // Agregar transferencia
            const nuevaTransferencia = {
                ...transferencia,
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                tipo: 'transferencia',
                fechaCreacion: new Date().toISOString()
            };

            const transacciones = [...(datosActuales.transacciones || []), nuevaTransferencia];

            const cuentasBase = await obtenerCuentasMesAnterior(userId, mes, ano);
            const { cuentas, ingresoTotal, gastosTotal, categorias } = recalcularDatosMes(
                cuentasBase,
                transacciones,
                datosActuales.categorias || CATEGORIAS_DEFAULT
            );

            await setDoc(docRef, {
                ...datosActuales,
                mes,
                ano,
                transacciones,
                cuentas,
                ingresoTotal,
                gastosTotal,
                categorias,
                actualizadoEn: new Date().toISOString()
            });

            setAgregando(false);
            return true;
        } catch (err) {
            console.error('Error al agregar transferencia:', err);
            setError(err);
            setAgregando(false);
            return false;
        }
    };

    return { agregar, agregando, error };
}

/**
 * Hook para cargar categorías personalizadas del usuario
 */
export function useCategorias(userId, tipo) {
    const [categorias, setCategorias] = useState([]);
    const [cargando, setCargando] = useState(true);

    const campo = tipo === 'ingreso' ? 'ingresos' : 'egresos';

    const normalizarLista = (lista, tipoMovimiento) => {
        const normalizadas = Array.isArray(lista)
            ? lista.map(categoria => normalizarCategoriaConfig(categoria, tipoMovimiento))
            : [];

        const defaults = obtenerCategoriasDefaultPorTipo(tipoMovimiento);
        const nombresExistentes = new Set(
            normalizadas.map(categoria => categoria.nombre.trim().toLowerCase())
        );

        defaults.forEach((categoriaDefault) => {
            const clave = categoriaDefault.nombre.trim().toLowerCase();
            if (!nombresExistentes.has(clave)) {
                normalizadas.push({ ...categoriaDefault });
            }
        });

        return normalizadas;
    };

    const construirConfigNormalizada = (data = {}) => ({
        ingresos: normalizarLista(data.ingresos, 'ingreso'),
        egresos: normalizarLista(data.egresos, 'egreso'),
    });

    useEffect(() => {
        if (!userId) {
            setCategorias(obtenerCategoriasDefaultPorTipo(tipo));
            setCargando(false);
            return;
        }

        const docRef = doc(db, 'users', userId, 'configuracion', 'categorias');

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const configNormalizada = construirConfigNormalizada(data);
                setCategorias(configNormalizada[campo]);

                const hayCambios =
                    JSON.stringify(data.ingresos || []) !== JSON.stringify(configNormalizada.ingresos) ||
                    JSON.stringify(data.egresos || []) !== JSON.stringify(configNormalizada.egresos);

                if (hayCambios) {
                    setDoc(docRef, configNormalizada, { merge: true }).catch((err) => {
                        console.error('Error al normalizar categorías:', err);
                    });
                }
            } else {
                const defaults = crearConfigCategoriasDefault();
                setCategorias(defaults[campo]);
                setDoc(docRef, defaults, { merge: true }).catch((err) => {
                    console.error('Error al crear categorías por defecto:', err);
                });
            }
            setCargando(false);
        });

        return () => unsubscribe();
    }, [userId, tipo]);

    return { categorias, cargando };
}

/**
 * Hook para gestionar categorías (agregar, editar, eliminar)
 */
export function useGestionarCategorias() {
    const [guardando, setGuardando] = useState(false);

    const campoPorTipo = (tipo) => (tipo === 'ingreso' ? 'ingresos' : 'egresos');

    const asegurarConfigNormalizada = (data = {}) => ({
        ingresos: Array.isArray(data.ingresos)
            ? data.ingresos.map(categoria => normalizarCategoriaConfig(categoria, 'ingreso'))
            : obtenerCategoriasDefaultPorTipo('ingreso'),
        egresos: Array.isArray(data.egresos)
            ? data.egresos.map(categoria => normalizarCategoriaConfig(categoria, 'egreso'))
            : obtenerCategoriasDefaultPorTipo('egreso'),
    });

    const agregarCategoria = async (userId, tipo, categoria) => {
        setGuardando(true);
        try {
            const docRef = doc(db, 'users', userId, 'configuracion', 'categorias');
            const docSnap = await getDoc(docRef);

            let data = crearConfigCategoriasDefault();
            if (docSnap.exists()) {
                data = asegurarConfigNormalizada(docSnap.data());
            }

            const campo = campoPorTipo(tipo);
            const nuevaCategoria = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                ...normalizarCategoriaConfig(categoria, tipo),
            };

            data[campo] = [...(data[campo] || []), nuevaCategoria];

            await setDoc(docRef, data);
            setGuardando(false);
            return true;
        } catch (err) {
            console.error('Error al agregar categoría:', err);
            setGuardando(false);
            return false;
        }
    };

    const editarCategoria = async (userId, tipo, categoriaId, cambios) => {
        setGuardando(true);
        try {
            const docRef = doc(db, 'users', userId, 'configuracion', 'categorias');
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                setGuardando(false);
                return false;
            }

            const data = asegurarConfigNormalizada(docSnap.data());
            const campo = campoPorTipo(tipo);
            const categorias = data[campo] || [];

            const index = categorias.findIndex(c => c.id === categoriaId);
            if (index >= 0) {
                categorias[index] = normalizarCategoriaConfig({
                    ...categorias[index],
                    ...cambios,
                }, tipo);
                data[campo] = categorias;
                await setDoc(docRef, data);
            }

            setGuardando(false);
            return true;
        } catch (err) {
            console.error('Error al editar categoría:', err);
            setGuardando(false);
            return false;
        }
    };

    const eliminarCategoria = async (userId, tipo, categoriaId) => {
        setGuardando(true);
        try {
            const docRef = doc(db, 'users', userId, 'configuracion', 'categorias');
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                setGuardando(false);
                return false;
            }

            const data = asegurarConfigNormalizada(docSnap.data());
            const campo = campoPorTipo(tipo);
            const categorias = data[campo] || [];

            data[campo] = categorias.filter(c => c.id !== categoriaId);
            await setDoc(docRef, data);

            setGuardando(false);
            return true;
        } catch (err) {
            console.error('Error al eliminar categoría:', err);
            setGuardando(false);
            return false;
        }
    };

    return { agregarCategoria, editarCategoria, eliminarCategoria, guardando };
}

/**
 * Hook para cargar cuentas personalizadas del usuario
 */
export function useCuentas(userId) {
    const [cuentas, setCuentas] = useState([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        if (!userId) {
            // Cuentas por defecto
            setCuentas(CUENTAS_DEFAULT.map(cuenta => ({ ...cuenta })));
            setCargando(false);
            return;
        }

        const docRef = doc(db, 'users', userId, 'configuracion', 'cuentas');

        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setCuentas(docSnap.data().cuentas || []);
            } else {
                // Cuentas por defecto
                setCuentas(CUENTAS_DEFAULT.map(cuenta => ({ ...cuenta })));
            }
            setCargando(false);
        });

        return () => unsubscribe();
    }, [userId]);

    return { cuentas, cargando };
}

/**
 * Hook para obtener historial de descripciones únicas por tipo
 * Usado para autocompletar descripción + preseleccionar categoría y cuenta
 */
export function useHistorialDescripciones(userId, tipo) {
    const [historial, setHistorial] = useState([]);

    useEffect(() => {
        if (!userId) { setHistorial([]); return; }

        const finanzasRef = collection(db, 'users', userId, 'finanzas');
        getDocs(finanzasRef).then((snapshot) => {
            const mapa = {};
            const docs = snapshot.docs.sort((a, b) => a.id.localeCompare(b.id));
            docs.forEach(docSnap => {
                const data = docSnap.data();
                (data.transacciones || []).forEach(t => {
                    if (t.tipo !== tipo) return;
                    const desc = t.descripcion?.trim();
                    if (!desc) return;
                    const clave = desc.toLowerCase();
                    mapa[clave] = {
                        descripcion: desc,
                        categoria: t.categoria || null,
                        cuentaId: t.cuentaId || null,
                        color: t.color || null,
                    };
                });
            });
            setHistorial(Object.values(mapa));
        }).catch(() => setHistorial([]));
    }, [userId, tipo]);

    return { historial };
}

// ═══════════════════════════════════════════════════════════════════════════
// COLECCIONES GENERALES (SIN AUTENTICACIÓN)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook para gestionar tareas generales (sin usuario)
 * Estructura: tareas/{tareaId}
 */
export function useTareas() {
    const [tareas, setTareas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const tareasRef = collection(db, 'tareas');
        const q = query(tareasRef);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const tareasList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setTareas(tareasList);
                setCargando(false);
            },
            (err) => {
                console.error('Error al cargar tareas:', err);
                setError(err);
                setCargando(false);
            }
        );

        return () => unsubscribe();
    }, []);

    return { tareas, cargando, error };
}

/**
 * Hook para agregar una nueva tarea
 */
export function useAgregarTarea() {
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    const agregar = async (tarea) => {
        setGuardando(true);
        setError(null);

        try {
            const tareasRef = collection(db, 'tareas');
            const nuevoId = `tarea_${Date.now()}`;
            const tareaRef = doc(tareasRef, nuevoId);

            await setDoc(tareaRef, {
                ...tarea,
                creadoEn: new Date().toISOString(),
                actualizadoEn: new Date().toISOString()
            });

            setGuardando(false);
            return true;
        } catch (err) {
            console.error('Error al agregar tarea:', err);
            setError(err);
            setGuardando(false);
            return false;
        }
    };

    return { agregar, guardando, error };
}

/**
 * Hook para editar una tarea existente
 */
export function useEditarTarea() {
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    const editar = async (tareaId, datosActualizados) => {
        setGuardando(true);
        setError(null);

        try {
            const tareaRef = doc(db, 'tareas', tareaId);

            await updateDoc(tareaRef, {
                ...datosActualizados,
                actualizadoEn: new Date().toISOString()
            });

            setGuardando(false);
            return true;
        } catch (err) {
            console.error('Error al editar tarea:', err);
            setError(err);
            setGuardando(false);
            return false;
        }
    };

    return { editar, guardando, error };
}

/**
 * Hook para eliminar una tarea
 */
export function useEliminarTarea() {
    const [eliminando, setEliminando] = useState(false);
    const [error, setError] = useState(null);

    const eliminar = async (tareaId) => {
        setEliminando(true);
        setError(null);

        try {
            const tareaRef = doc(db, 'tareas', tareaId);
            await deleteDoc(tareaRef);

            setEliminando(false);
            return true;
        } catch (err) {
            console.error('Error al eliminar tarea:', err);
            setError(err);
            setEliminando(false);
            return false;
        }
    };

    return { eliminar, eliminando, error };
}

/**
 * Hook para gestionar productos generales
 * Estructura: productos/{productoId}
 */
export function useProductos() {
    const [productos, setProductos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const productosRef = collection(db, 'productos');
        const q = query(productosRef);

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const productosList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })).sort((a, b) => {
                    // Ordenar alfabéticamente por nombre                    
                    const nombreA = (a.nombre || '').toLowerCase();
                    const nombreB = (b.nombre || '').toLowerCase();
                    return nombreA.localeCompare(nombreB);
                });
                setProductos(productosList);
                setCargando(false);
            },
            (err) => {
                console.error('Error al cargar productos:', err);
                setError(err);
                setCargando(false);
            }
        );

        return () => unsubscribe();
    }, []);

    return { productos, cargando, error };
}

/**
 * Hook para gestionar stock general
 * Estructura: stock/{stockId} (un documento único o por mes)
 */
export function useStock() {
    const [stock, setStock] = useState({});
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Usar un documento único para el stock
        const stockRef = doc(db, 'stock', 'actual');

        const unsubscribe = onSnapshot(
            stockRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    setStock(docSnap.data());
                } else {
                    setStock({});
                }
                setCargando(false);
            },
            (err) => {
                console.error('Error al cargar stock:', err);
                setError(err);
                setCargando(false);
            }
        );

        return () => unsubscribe();
    }, []);

    return { stock, cargando, error };
}

/**
 * Hook para actualizar el stock
 */
export function useActualizarStock() {
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    const actualizar = async (stockActualizado) => {
        setGuardando(true);
        setError(null);

        try {
            const stockRef = doc(db, 'stock', 'actual');

            await setDoc(stockRef, {
                ...stockActualizado,
                actualizadoEn: new Date().toISOString()
            }, { merge: true });

            setGuardando(false);
            return true;
        } catch (err) {
            console.error('Error al actualizar stock:', err);
            setError(err);
            setGuardando(false);
            return false;
        }
    };

    return { actualizar, guardando, error };
}

/**
 * Hook para agregar un nuevo producto
 */
export function useAgregarProducto() {
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    const agregar = async (producto) => {
        setGuardando(true);
        setError(null);

        try {
            const productosRef = collection(db, 'productos');
            const nuevoId = `producto_${Date.now()}`;
            const productoRef = doc(productosRef, nuevoId);

            await setDoc(productoRef, {
                ...producto,
                creadoEn: new Date().toISOString(),
                actualizadoEn: new Date().toISOString()
            });

            setGuardando(false);
            return true;
        } catch (err) {
            console.error('Error al agregar producto:', err);
            setError(err);
            setGuardando(false);
            return false;
        }
    };

    return { agregar, guardando, error };
}

/**
 * Hook para eliminar un producto
 */
export function useEliminarProducto() {
    const [eliminando, setEliminando] = useState(false);
    const [error, setError] = useState(null);

    const eliminar = async (productoId) => {
        setEliminando(true);
        setError(null);

        try {
            const productoRef = doc(db, 'productos', productoId);
            await deleteDoc(productoRef);

            setEliminando(false);
            return true;
        } catch (err) {
            console.error('Error al eliminar producto:', err);
            setError(err);
            setEliminando(false);
            return false;
        }
    };

    return { eliminar, eliminando, error };
}

/**
 * Hook para editar un producto existente
 */
export function useEditarProducto() {
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    const editar = async (productoId, datosActualizados) => {
        setGuardando(true);
        setError(null);

        try {
            const productoRef = doc(db, 'productos', productoId);

            await updateDoc(productoRef, {
                ...datosActualizados,
                actualizadoEn: new Date().toISOString()
            });

            setGuardando(false);
            return true;
        } catch (err) {
            console.error('Error al editar producto:', err);
            setError(err);
            setGuardando(false);
            return false;
        }
    };

    return { editar, guardando, error };
}

/**
 * Hook para gestionar precios de productos
 * Estructura: precios/{productId}
 */
export function usePrecios() {
    const [precios, setPrecios] = useState({});
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const preciosRef = collection(db, 'precios');

        const unsubscribe = onSnapshot(
            preciosRef,
            (snapshot) => {
                const preciosMap = {};
                snapshot.docs.forEach(doc => {
                    preciosMap[doc.id] = doc.data();
                });
                setPrecios(preciosMap);
                setCargando(false);
            },
            (err) => {
                console.error('Error al cargar precios:', err);
                setError(err);
                setCargando(false);
            }
        );

        return () => unsubscribe();
    }, []);

    return { precios, cargando, error };
}

/**
 * Hook para actualizar precios de un producto
 */
export function useActualizarPrecios() {
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    const actualizar = async (productoId, datosPrecio) => {
        setGuardando(true);
        setError(null);

        try {
            const precioRef = doc(db, 'precios', productoId);

            await setDoc(precioRef, {
                ...datosPrecio,
                actualizadoEn: new Date().toISOString()
            }, { merge: true });

            setGuardando(false);
            return true;
        } catch (err) {
            console.error('Error al actualizar precios:', err);
            setError(err);
            setGuardando(false);
            return false;
        }
    };

    return { actualizar, guardando, error };
}

/**
 * Hook para gestionar descuentos de supermercados
 * Estructura: descuentos/lista
 */
export function useDescuentos() {
    const [descuentos, setDescuentos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const descuentosRef = doc(db, 'descuentos', 'lista');

        const unsubscribe = onSnapshot(
            descuentosRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    setDescuentos(docSnap.data().descuentos || []);
                } else {
                    setDescuentos([]);
                }
                setCargando(false);
            },
            (err) => {
                console.error('Error al cargar descuentos:', err);
                setError(err);
                setCargando(false);
            }
        );

        return () => unsubscribe();
    }, []);

    return { descuentos, cargando, error };
}

/**
 * Hook para agregar un descuento
 */
export function useAgregarDescuento() {
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    const agregar = async (descuento) => {
        setGuardando(true);
        setError(null);

        try {
            const descuentosRef = doc(db, 'descuentos', 'lista');
            const docSnap = await getDoc(descuentosRef);

            let descuentosActuales = [];
            if (docSnap.exists()) {
                descuentosActuales = docSnap.data().descuentos || [];
            }

            const nuevoDescuento = {
                ...descuento,
                id: `desc_${Date.now()}`,
                creadoEn: new Date().toISOString()
            };

            await setDoc(descuentosRef, {
                descuentos: [...descuentosActuales, nuevoDescuento],
                actualizadoEn: new Date().toISOString()
            });

            setGuardando(false);
            return true;
        } catch (err) {
            console.error('Error al agregar descuento:', err);
            setError(err);
            setGuardando(false);
            return false;
        }
    };

    return { agregar, guardando, error };
}

/**
 * Hook para eliminar un descuento
 */
export function useEliminarDescuento() {
    const [eliminando, setEliminando] = useState(false);
    const [error, setError] = useState(null);

    const eliminar = async (descuentoId) => {
        setEliminando(true);
        setError(null);

        try {
            const descuentosRef = doc(db, 'descuentos', 'lista');
            const docSnap = await getDoc(descuentosRef);

            if (docSnap.exists()) {
                const descuentosActuales = docSnap.data().descuentos || [];
                const descuentosFiltrados = descuentosActuales.filter(d => d.id !== descuentoId);

                await setDoc(descuentosRef, {
                    descuentos: descuentosFiltrados,
                    actualizadoEn: new Date().toISOString()
                });
            }

            setEliminando(false);
            return true;
        } catch (err) {
            console.error('Error al eliminar descuento:', err);
            setError(err);
            setEliminando(false);
            return false;
        }
    };

    return { eliminar, eliminando, error };
}

/**
 * Hook para editar un descuento existente
 */
/**
 * Hook para guardar/cargar/borrar la sesión de En Compra
 * Ruta: sessions/encompra (documento único compartido, sin auth)
 */
export function useSesionEnCompra() {
    const docRef = doc(db, 'sessions', 'encompra');

    const guardarSesion = async (datos) => {
        try {
            await setDoc(docRef, { ...datos, actualizadoEn: new Date().toISOString() });
            return true;
        } catch {
            return false;
        }
    };

    const cargarSesion = async () => {
        try {
            const snap = await getDoc(docRef);
            return snap.exists() ? snap.data() : null;
        } catch {
            return null;
        }
    };

    const borrarSesion = async () => {
        try {
            await deleteDoc(docRef);
            return true;
        } catch {
            return false;
        }
    };

    return { guardarSesion, cargarSesion, borrarSesion };
}

/**
 * Hook para leer historial de compras finalizadas
 * Estructura: compras_historial/lista
 */
export function useHistorialCompras() {
    const [historial, setHistorial] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const storageKey = 'abills_compra_historial';

    useEffect(() => {
        try {
            const guardado = localStorage.getItem(storageKey);
            const compras = guardado ? JSON.parse(guardado) : [];
            setHistorial(Array.isArray(compras) ? compras : []);
        } catch (err) {
            setError(err);
            setHistorial([]);
        }
        setCargando(false);
    }, []);

    return { historial, cargando, error };
}

/**
 * Hook para guardar una compra en historial
 */
export function useAgregarCompraHistorial() {
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);
    const storageKey = 'abills_compra_historial';

    const agregar = async (compra) => {
        setGuardando(true);
        setError(null);
        try {
            const fechaActual = new Date().toISOString();
            const nuevaCompra = {
                ...compra,
                fecha: fechaActual,
                creadaEn: fechaActual,
                id: `compra_${Date.now()}`
            };

            const guardado = localStorage.getItem(storageKey);
            const comprasActuales = guardado ? JSON.parse(guardado) : [];
            const comprasActualizadas = [nuevaCompra, ...(Array.isArray(comprasActuales) ? comprasActuales : [])].slice(0, 30);

            localStorage.setItem(storageKey, JSON.stringify(comprasActualizadas));

            setGuardando(false);
            return true;
        } catch (err) {
            setError(err);
            setGuardando(false);
            return false;
        }
    };

    return { agregar, guardando, error };
}

export function useEditarDescuento() {
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState(null);

    const editar = async (descuentoId, datos) => {
        setGuardando(true);
        setError(null);
        try {
            const descuentosRef = doc(db, 'descuentos', 'lista');
            const docSnap = await getDoc(descuentosRef);
            if (docSnap.exists()) {
                const actualizados = (docSnap.data().descuentos || []).map(d =>
                    d.id === descuentoId ? { ...d, ...datos } : d
                );
                await setDoc(descuentosRef, {
                    descuentos: actualizados,
                    actualizadoEn: new Date().toISOString()
                });
            }
            setGuardando(false);
            return true;
        } catch (err) {
            console.error('Error al editar descuento:', err);
            setError(err);
            setGuardando(false);
            return false;
        }
    };

    return { editar, guardando, error };
}
