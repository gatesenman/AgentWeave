import { create } from "zustand";
import {
  getProjectStatus,
  listVendors,
  generateConfigs,
  healthCheck,
  compareVendors,
  getGovernanceStatus,
  getTraceSpans,
  listMcpServers,
  startWatch,
  stopWatch,
  validateConfig,
  exportConfig,
  type ProjectStatus,
  type VendorInfo,
  type HealthStatus,
  type CompareEntry,
  type GovernanceStatus,
  type TraceSpan,
  type McpServerInfo,
  type GenerateResult,
  type ValidationResult,
} from "../lib/tauri";

interface ConfigState {
  projectDir: string;
  projectStatus: ProjectStatus | null;
  vendors: VendorInfo[];
  healthStatus: HealthStatus | null;
  compareEntries: CompareEntry[];
  governanceStatus: GovernanceStatus | null;
  traceSpans: TraceSpan[];
  mcpServers: McpServerInfo[];
  generateResults: GenerateResult[];
  validationResult: ValidationResult | null;
  isLoading: boolean;
  isWatching: boolean;
  error: string | null;

  setProjectDir: (dir: string) => void;
  loadProject: () => Promise<void>;
  loadVendors: () => Promise<void>;
  loadHealth: () => Promise<void>;
  loadCompare: () => Promise<void>;
  loadGovernance: () => Promise<void>;
  loadTraces: () => Promise<void>;
  loadMcpServers: () => Promise<void>;
  runGenerate: (vendor?: string) => Promise<void>;
  runValidate: () => Promise<void>;
  runExport: (format: string) => Promise<string>;
  toggleWatch: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  projectDir: "",
  projectStatus: null,
  vendors: [],
  healthStatus: null,
  compareEntries: [],
  governanceStatus: null,
  traceSpans: [],
  mcpServers: [],
  generateResults: [],
  validationResult: null,
  isLoading: false,
  isWatching: false,
  error: null,

  setProjectDir: (dir: string) => set({ projectDir: dir }),

  loadProject: async () => {
    const { projectDir } = get();
    if (!projectDir) return;
    set({ isLoading: true, error: null });
    try {
      const status = await getProjectStatus(projectDir);
      set({ projectStatus: status, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  loadVendors: async () => {
    try {
      const vendors = await listVendors();
      set({ vendors });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  loadHealth: async () => {
    const { projectDir } = get();
    if (!projectDir) return;
    try {
      const healthStatus = await healthCheck(projectDir);
      set({ healthStatus });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  loadCompare: async () => {
    const { projectDir } = get();
    if (!projectDir) return;
    try {
      const compareEntries = await compareVendors(projectDir);
      set({ compareEntries });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  loadGovernance: async () => {
    const { projectDir } = get();
    if (!projectDir) return;
    try {
      const governanceStatus = await getGovernanceStatus(projectDir);
      set({ governanceStatus });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  loadTraces: async () => {
    try {
      const traceSpans = await getTraceSpans();
      set({ traceSpans });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  loadMcpServers: async () => {
    const { projectDir } = get();
    if (!projectDir) return;
    try {
      const mcpServers = await listMcpServers(projectDir);
      set({ mcpServers });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  runGenerate: async (vendor?: string) => {
    const { projectDir } = get();
    if (!projectDir) return;
    set({ isLoading: true });
    try {
      const results = await generateConfigs(projectDir, vendor);
      set({ generateResults: results, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  runValidate: async () => {
    const { projectDir } = get();
    if (!projectDir) return;
    try {
      const result = await validateConfig(projectDir);
      set({ validationResult: result });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  runExport: async (format: string) => {
    const { projectDir } = get();
    if (!projectDir) return "";
    try {
      return await exportConfig(projectDir, format);
    } catch (e) {
      set({ error: String(e) });
      return "";
    }
  },

  toggleWatch: async () => {
    const { projectDir, isWatching } = get();
    if (!projectDir) return;
    try {
      if (isWatching) {
        await stopWatch();
        set({ isWatching: false });
      } else {
        await startWatch(projectDir);
        set({ isWatching: true });
      }
    } catch (e) {
      set({ error: String(e) });
    }
  },
}));
