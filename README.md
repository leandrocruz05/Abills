# AbilLs Finance App 💰

Una aplicación moderna para gestión de finanzas personales construida con React, TypeScript y Firebase.

## 🚀 Características

- **Autenticación segura** con Firebase Auth (login/registro)
- **Dashboard principal** con resumen financiero mensual
- **Cuentas múltiples**: Débito, Efectivo, Inversiones
- **Seguimiento de ingresos y gastos** por categorías
- **Planificación presupuestaria** y objetivos de ahorro
- **Navegación intuitiva** con 5 pestañas principales
- **Diseño responsivo** optimizado para móviles
- **Datos mensuales** organizados y persistentes

## 📱 Pantallas Principales

### 1. Autenticación
- Inicio de sesión y registro de usuarios
- Validación de formularios
- Integración con Firebase Auth

### 2. Dashboard Principal  
- Selector de mes con historial
- Balance total de cuentas
- Resumen de ingresos vs gastos
- Gestión de 3 tipos de cuentas predeterminadas
- Gráfico de gastos por categoría (similar a la imagen)

### 3. Planificación
- Presupuesto por categorías
- Objetivos de ahorro
- Seguimiento del progreso mensual
- Alertas de límites presupuestarios

### 4. Navegación Inferior
- Principal (Dashboard)
- Transacciones 
- Botón + (Agregar)
- Planificación
- Más opciones

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router DOM
- **Backend**: Firebase (Auth + Firestore)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Styling**: CSS Personalizado con temas oscuros

## 📦 Instalación y Configuración

### Prerrequisitos
- Node.js >= 16
- npm >= 8
- Cuenta de Firebase

### 1. Clonar e instalar dependencias
```bash
npm install
```

### 2. Configurar Firebase
1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com)
2. Habilita Authentication (Email/Password)
3. Crea una base de datos Firestore
4. Copia la configuración y actualiza `src/config/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "tu-api-key",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "tu-sender-id",
  appId: "tu-app-id"
};
```

### 3. Ejecutar en desarrollo
```bash
npm run dev          # Servidor con Hot Module Replacement (recomendado)
npm run dev:watch    # Servidor con nodemon (alternativo)
npm run start        # Servidor con acceso desde red
```

**¡Importante!** Vite ya incluye **Hot Module Replacement (HMR)** que recarga automáticamente los cambios en tiempo real, por lo que `npm run dev` es la opción recomendada.

### 4. Scripts disponibles
```bash
npm run dev          # Desarrollo con HMR integrado
npm run dev:watch    # Desarrollo con nodemon  
npm run dev:nodemon  # Desarrollo alternativo con nodemon
npm run build        # Build para producción
npm run preview      # Preview del build
npm run lint         # Linter ESLint
npm run start        # Servidor con acceso de red
npm run clean        # Limpiar archivos temporales
```

### 5. Build para producción
```bash
npm run build
```

## 🗂️ Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── AuthScreen.tsx      # Pantalla de login/registro
│   ├── Dashboard.tsx       # Dashboard principal  
│   ├── Planning.tsx        # Planificación financiera
│   ├── BottomNavigation.tsx # Navegación inferior
│   └── ProtectedRoute.tsx   # Rutas protegidas
├── contexts/           # Contextos de React
│   └── AuthContext.tsx     # Manejo de autenticación
├── config/            # Configuraciones
│   └── firebase.ts         # Configuración Firebase
├── types/             # Tipos TypeScript
│   └── index.ts            # Interfaces y tipos
├── App.tsx           # Componente principal
├── main.tsx          # Punto de entrada
└── index.css         # Estilos globales
```

## 📊 Modelos de Datos

### Account
```typescript
interface Account {
  id: string;
  name: string;
  type: 'debit' | 'cash' | 'investments';
  balance: number;
  icon: string;
}
```

### Transaction  
```typescript
interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  accountId: string;
  date: Date;
  userId: string;
}
```

### MonthlyData
```typescript
interface MonthlyData {
  id: string;
  userId: string;
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  accounts: Account[];
  transactions: Transaction[];
  categories: { [key: string]: number };
}
```

## 🎨 Características del Diseño

- **Tema oscuro** optimizado para uso nocturno
- **Glassmorphism** con efectos de blur y transparencias
- **Gradientes modernos** en botones y elementos destacados
- **Iconografía consistente** con Lucide React
- **Tipografía clara** con jerarquía visual definida
- **Colores semánticos** (verde=ingresos, rojo=gastos)

## 🔒 Seguridad

- Autenticación Firebase con validación de formularios
- Rutas protegidas que requieren autenticación  
- Datos de usuario aislados por UID
- Reglas de seguridad de Firestore por implementar

## 📈 Próximas Funcionalidades

- [ ] Agregar transacciones (modal/página)
- [ ] Más gráficos y visualizaciones
- [ ] Exportar datos a CSV/PDF
- [ ] Notificaciones push
- [ ] Modo claro/oscuro
- [ ] Múltiples monedas
- [ ] Sincronización con bancos
- [ ] Reportes detallados

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Soporte

Si tienes preguntas o issues, por favor crea un [issue](../../issues) en GitHub.

---

**¡Desarrolla tus finanzas personales con AbilLs! 🚀💰**