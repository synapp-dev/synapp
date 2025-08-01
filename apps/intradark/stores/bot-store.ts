import { create } from "zustand";

export interface BotMessage {
  id: string;
  text: string;
  type: "loading" | "success" | "error" | "info";
  timestamp: number;
}

export interface BotStatus {
  currentStep: number;
  messages: BotMessage[];
  services: {
    steam: {
      status: "idle" | "loading" | "success" | "error";
      data?: any;
      error?: string;
    };
    leetify: {
      status: "idle" | "loading" | "success" | "error";
      data?: any;
      error?: string;
    };
    faceit: {
      status: "idle" | "loading" | "success" | "error";
      data?: any;
      error?: string;
    };
    csstats: {
      status: "idle" | "loading" | "success" | "error";
      data?: any;
      error?: string;
    };
  };
}

interface BotStore extends BotStatus {
  // Actions
  reset: () => void;
  addMessage: (text: string, type: BotMessage["type"]) => void;
  setCurrentStep: (step: number) => void;
  updateServiceStatus: (
    service: keyof BotStatus["services"],
    status: BotStatus["services"]["steam"]["status"],
    data?: any,
    error?: string
  ) => void;
  setPlayer: (steamId64: string | null) => void;
}

const initialState: BotStatus = {
  currentStep: 0,
  messages: [],
  services: {
    steam: { status: "idle" },
    leetify: { status: "idle" },
    faceit: { status: "idle" },
    csstats: { status: "idle" },
  },
};

export const useBotStore = create<BotStore>((set, get) => ({
  ...initialState,

  reset: () => {
    set(initialState);
  },

  addMessage: (text: string, type: BotMessage["type"] = "info") => {
    const newMessage: BotMessage = {
      id: Date.now().toString(),
      text,
      type,
      timestamp: Date.now(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
  },

  setCurrentStep: (step: number) => {
    set({ currentStep: step });
  },

  updateServiceStatus: (
    service: keyof BotStatus["services"],
    status: BotStatus["services"]["steam"]["status"],
    data?: any,
    error?: string
  ) => {
    set((state) => ({
      services: {
        ...state.services,
        [service]: {
          status,
          data,
          error,
        },
      },
    }));
  },

  setPlayer: (steamId64: string | null) => {
    if (steamId64) {
      set((state) => ({
        ...initialState,
        messages: [
          {
            id: Date.now().toString(),
            text: "🤖 Hello! I'm your CS2 stats assistant. Let me search for player data...",
            type: "info" as const,
            timestamp: Date.now(),
          },
        ],
      }));
    } else {
      set(initialState);
    }
  },
}));
