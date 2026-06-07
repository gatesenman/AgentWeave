import { Routes, Route } from "react-router-dom";
import { useThemeStore } from "./store/theme";
import Sidebar from "./components/Sidebar";
import Titlebar from "./components/Titlebar";
import Statusbar from "./components/Statusbar";
import Dashboard from "./pages/Dashboard";
import ConfigHub from "./pages/ConfigHub";
import Generate from "./pages/Generate";
import Compare from "./pages/Compare";
import Settings from "./pages/Settings";
import Governance from "./pages/Governance";
import Trace from "./pages/Trace";
import Acp from "./pages/Acp";
import Backup from "./pages/Backup";
import SearchPage from "./pages/SearchPage";
import ConflictResolver from "./pages/ConflictResolver";
import Templates from "./pages/Templates";
import TeamHub from "./pages/TeamHub";
import DryRun from "./pages/DryRun";
import ConceptGraph from "./pages/ConceptGraph";
import ContextOptimizer from "./pages/ContextOptimizer";
import MigrationWizard from "./pages/MigrationWizard";
import ConfigLint from "./pages/ConfigLint";
import CostDashboard from "./pages/CostDashboard";
import Webhooks from "./pages/Webhooks";
import PerformanceAB from "./pages/PerformanceAB";
import PromptTesting from "./pages/PromptTesting";
import AIAssist from "./pages/AIAssist";
import ConfigAnalytics from "./pages/ConfigAnalytics";
import Environments from "./pages/Environments";
import InheritanceView from "./pages/InheritanceView";
import { useEffect } from "react";

function App() {
  const { theme } = useThemeStore();

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  return (
    <div className="flex flex-col h-screen bg-[#fafafa] dark:bg-[#18181b] text-[#27272a] dark:text-[#e4e4e7] overflow-hidden">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/config/*" element={<ConfigHub />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/dryrun" element={<DryRun />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/graph" element={<ConceptGraph />} />
            <Route path="/governance" element={<Governance />} />
            <Route path="/trace" element={<Trace />} />
            <Route path="/acp" element={<Acp />} />
            <Route path="/backup" element={<Backup />} />
            <Route path="/conflicts" element={<ConflictResolver />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/team" element={<TeamHub />} />
            <Route path="/optimizer" element={<ContextOptimizer />} />
            <Route path="/migration" element={<MigrationWizard />} />
            <Route path="/lint" element={<ConfigLint />} />
            <Route path="/cost" element={<CostDashboard />} />
            <Route path="/webhooks" element={<Webhooks />} />
            <Route path="/perf" element={<PerformanceAB />} />
            <Route path="/prompt-test" element={<PromptTesting />} />
            <Route path="/ai-assist" element={<AIAssist />} />
            <Route path="/analytics" element={<ConfigAnalytics />} />
            <Route path="/environments" element={<Environments />} />
            <Route path="/inheritance" element={<InheritanceView />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/search" element={<SearchPage />} />
          </Routes>
        </main>
      </div>
      <Statusbar />
    </div>
  );
}

export default App;
