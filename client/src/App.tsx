import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import { Loader2 } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  FileText,
  RefreshCw,
  Siren,
  Activity,
  Shield,
  BarChart3,
  QrCode,
} from "lucide-react";

// Lazy-loaded pages for better performance
const InventoryPage = lazy(() => import("./pages/Inventory"));
const OrdersPage = lazy(() => import("./pages/Orders"));
const SuppliersPage = lazy(() => import("./pages/Suppliers"));
const Top20ValuePage = lazy(() => import("./pages/Top20Value"));
const Top20ZeroPage = lazy(() => import("./pages/Top20Zero"));
const SyncPage = lazy(() => import("./pages/Sync"));
const StockCeroConOCPage = lazy(() => import("./pages/StockCeroConOC"));
const AnalyticsPage = lazy(() => import("./pages/Analytics"));
const AdminPage = lazy(() => import("./pages/Admin"));
const ConsumoPage = lazy(() => import("./pages/Consumo"));
const QRAccessPage = lazy(() => import("./pages/QRAccess"));
const FacturacionPage = lazy(() => import("./pages/Facturacion"));

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Analytics", href: "/analytics", icon: Activity },
  { label: "Inventario", href: "/inventario", icon: Package },
  { label: "Top 20 Valor", href: "/top-valor", icon: TrendingUp },
  { label: "Consumo", href: "/consumo", icon: BarChart3 },
  { label: "Órdenes", href: "/ordenes", icon: ShoppingCart },
  { label: "Stock 0 + OC", href: "/stock-cero-oc", icon: Siren },
  { label: "Proveedores", href: "/proveedores", icon: Users },
  { label: "Facturación", href: "/facturacion", icon: FileText },
  { label: "QR Acceso", href: "/qr-acceso", icon: QrCode },
  { label: "Sincronizar", href: "/sync", icon: RefreshCw },
  { label: "Admin", href: "/admin", icon: Shield },
];

// Page loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[40vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#8CB32A' }} />
        <span className="text-xs font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#009890' }}>
          Cargando...
        </span>
      </div>
    </div>
  );
}

function Router() {
  return (
    <DashboardLayout>
      <Suspense fallback={<PageLoader />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/analytics" component={AnalyticsPage} />
          <Route path="/inventario" component={InventoryPage} />
          <Route path="/top-valor" component={Top20ValuePage} />
          <Route path="/stock-cero" component={Top20ZeroPage} />
          <Route path="/ordenes" component={OrdersPage} />
          <Route path="/stock-cero-oc" component={StockCeroConOCPage} />
          <Route path="/proveedores" component={SuppliersPage} />
          <Route path="/sync" component={SyncPage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/consumo" component={ConsumoPage} />
          <Route path="/facturacion" component={FacturacionPage} />
          <Route path="/qr-acceso" component={QRAccessPage} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <Router />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
