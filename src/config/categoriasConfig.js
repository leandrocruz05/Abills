export const ICONOS_CATEGORIA_DISPONIBLES = [
    { id: 'ajuste', nombre: 'Ajuste' },
    { id: 'inversiones', nombre: 'Inversiones' },
    { id: 'salario', nombre: 'Salario' },
    { id: 'casa', nombre: 'Casa' },
    { id: 'compartidos', nombre: 'Compartidos' },
    { id: 'individuales', nombre: 'Individual' },
    { id: 'pagos', nombre: 'Pagos' },
];

export const CATEGORIAS_CONFIG_DEFAULT = {
    ingresos: [
        { id: 'ajuste', nombre: 'Ajuste', color: '#6b7280', icono: 'ajuste', tipo: 'ajuste', tipoMovimiento: 'ingreso' },
        { id: 'inversiones', nombre: 'Inversiones', color: '#22c55e', icono: 'inversiones', tipo: 'inversiones', tipoMovimiento: 'ingreso' },
        { id: 'salario', nombre: 'Salario', color: '#ef4444', icono: 'salario', tipo: 'salario', tipoMovimiento: 'ingreso' },
    ],
    egresos: [
        { id: 'ajuste-eg', nombre: 'Ajuste', color: '#6b7280', icono: 'ajuste', tipo: 'ajuste', tipoMovimiento: 'egreso' },
        { id: 'casa', nombre: 'Casa', color: '#f59e0b', icono: 'casa', tipo: 'casa', tipoMovimiento: 'egreso' },
        { id: 'compartidos', nombre: 'Gastos Compartidos', color: '#a855f7', icono: 'compartidos', tipo: 'compartidos', tipoMovimiento: 'egreso' },
        { id: 'individuales', nombre: 'Gastos Individuales', color: '#06b6d4', icono: 'individuales', tipo: 'individuales', tipoMovimiento: 'egreso' },
        { id: 'inversiones-eg', nombre: 'Inversiones', color: '#22c55e', icono: 'inversiones', tipo: 'inversiones', tipoMovimiento: 'egreso' },
        { id: 'pagos', nombre: 'Pagos', color: '#ef4444', icono: 'pagos', tipo: 'pagos', tipoMovimiento: 'egreso' },
    ],
};

const ICONOS_VALIDOS = new Set(ICONOS_CATEGORIA_DISPONIBLES.map(icono => icono.id));

const inferirIconoPorNombre = (nombre, tipoMovimiento) => {
    const n = (nombre || '').toLowerCase();

    if (n.includes('salario')) return 'salario';
    if (n.includes('inversion')) return 'inversiones';
    if (n.includes('casa')) return 'casa';
    if (n.includes('compart')) return 'compartidos';
    if (n.includes('individual')) return 'individuales';
    if (n.includes('pago')) return 'pagos';

    return tipoMovimiento === 'ingreso' ? 'salario' : 'ajuste';
};

const normalizarTexto = (valor, fallback) => {
    if (typeof valor !== 'string') return fallback;
    const limpio = valor.trim();
    return limpio || fallback;
};

const idFallback = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const normalizarCategoriaConfig = (categoria, tipoMovimiento) => {
    const nombre = normalizarTexto(categoria?.nombre, 'Sin nombre');
    const iconoCrudo = categoria?.icono || categoria?.tipoIcono || categoria?.tipo;
    const icono = ICONOS_VALIDOS.has(iconoCrudo)
        ? iconoCrudo
        : inferirIconoPorNombre(nombre, tipoMovimiento);

    return {
        id: normalizarTexto(categoria?.id, idFallback()),
        nombre,
        color: normalizarTexto(categoria?.color, '#6b7280'),
        icono,
        // Compatibilidad con código existente que todavía usa "tipo" para el icono.
        tipo: icono,
        tipoMovimiento,
    };
};

export const obtenerCategoriasDefaultPorTipo = (tipoMovimiento) => {
    if (tipoMovimiento === 'ingreso') {
        return CATEGORIAS_CONFIG_DEFAULT.ingresos.map(c => ({ ...c }));
    }
    return CATEGORIAS_CONFIG_DEFAULT.egresos.map(c => ({ ...c }));
};

export const crearConfigCategoriasDefault = () => ({
    ingresos: obtenerCategoriasDefaultPorTipo('ingreso'),
    egresos: obtenerCategoriasDefaultPorTipo('egreso'),
});
