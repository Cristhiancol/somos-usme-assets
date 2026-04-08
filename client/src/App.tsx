import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import InventoryPage from "./pages/Inventory";
import OrdersPage from "./pages/Orders";
import SuppliersPage from "./pages/Suppliers";
import Top20ValuePage from "./pages/Top20Value";
import Top20ZeroPage from "./pages/Top20Zero";
import SyncPage from "./pages/Sync";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Inventario", href: "/inventario", icon: Package },
  { label: "Top 20 Valor", href: "/top-valor", icon: TrendingUp },
  { label: "Stock Cero", href: "/stock-cero", icon: AlertTriangle },
  { label: "Órdenes", href: "/ordenes", icon: ShoppingCart },
  { label: "Proveedores", href: "/proveedores", icon: Users },
  { label: "Sincronizar", href: "/sync", icon: RefreshCw },
];

function Router() {
  return (
    <DashboardLayout navItems={navItems} title="SOMOS USME // JIT SYSTEM">
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/inventario" component={InventoryPage} />
        <Route path="/top-valor" component={Top20ValuePage} />
        <Route path="/stock-cero" component={Top20ZeroPage} />
        <Route path="/ordenes" component={OrdersPage} />
        <Route path="/proveedores" component={SuppliersPage} />
        <Route path="/sync" component={SyncPage} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <Router />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
