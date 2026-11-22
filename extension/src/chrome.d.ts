declare namespace chrome {
  namespace runtime {
    const lastError: { message?: string } | undefined;
  }

  namespace storage {
    interface StorageArea {
      get(keys: string | string[] | null, callback: (items: Record<string, unknown>) => void): void;
      set(items: Record<string, unknown>, callback?: () => void): void;
      remove(keys: string | string[], callback?: () => void): void;
    }
    const local: StorageArea;
  }

  namespace tabs {
    interface Tab {
      id?: number;
      url?: string;
      title?: string;
    }
    function query(queryInfo: { active?: boolean; currentWindow?: boolean }): Promise<Tab[]>;
    function create(createProperties: { url: string }): Promise<Tab>;
  }

  namespace scripting {
    interface InjectionResult<T = unknown> {
      frameId: number;
      result?: T;
    }
    function executeScript<T = unknown>(injection: {
      target: { tabId: number; allFrames?: boolean };
      func: () => T;
    }): Promise<InjectionResult<T>[]>;
  }
}
