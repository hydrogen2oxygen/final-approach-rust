import {Injectable} from '@angular/core';

export interface RemoteOverviewHistoryEntry {
  id: string;
  name: string;
  lastVisitedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class RemoteOverviewHistoryService {

  private readonly storageKey = 'remoteOverviewHistory';

  getEntries(): RemoteOverviewHistoryEntry[] {
    const storedHistory = localStorage.getItem(this.storageKey);

    if (!storedHistory) {
      return [];
    }

    try {
      const entries = JSON.parse(storedHistory);

      if (!Array.isArray(entries)) {
        return [];
      }

      return entries
        .filter(this.isValidEntry)
        .sort((first, second) => second.lastVisitedAt.localeCompare(first.lastVisitedAt));
    } catch {
      return [];
    }
  }

  remember(id: string, name: string): void {
    const entries = this.getEntries().filter(entry => entry.id !== id);
    entries.unshift({
      id: id,
      name: name,
      lastVisitedAt: new Date().toISOString()
    });
    localStorage.setItem(this.storageKey, JSON.stringify(entries));
  }

  remove(id: string): void {
    const entries = this.getEntries().filter(entry => entry.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(entries));
  }

  getLastVisited(): RemoteOverviewHistoryEntry | undefined {
    return this.getEntries()[0];
  }

  private isValidEntry(entry: unknown): entry is RemoteOverviewHistoryEntry {
    if (!entry || typeof entry !== 'object') {
      return false;
    }

    const candidate = entry as Partial<RemoteOverviewHistoryEntry>;
    return typeof candidate.id === 'string' && candidate.id.length > 0
      && typeof candidate.name === 'string' && candidate.name.length > 0
      && typeof candidate.lastVisitedAt === 'string';
  }
}
