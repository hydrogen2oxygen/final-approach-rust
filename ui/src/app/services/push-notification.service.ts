import {Injectable} from '@angular/core';

interface PushConfiguration {
  publicKey: string;
}

interface PushSubscriptionState {
  overviewId: string;
  preacherName: string;
}

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {

  private readonly stateKey = 'territoryOverviewPushSubscription';
  private readonly declinedKeyPrefix = 'territoryOverviewPushDeclined:';

  isSupported(): boolean {
    return window.isSecureContext
      && 'serviceWorker' in navigator
      && 'PushManager' in window
      && 'Notification' in window;
  }

  getSubscribedOverviewId(): string | null {
    return this.getState()?.overviewId ?? null;
  }

  shouldOfferSubscription(overviewId: string): boolean {
    return this.isSupported()
      && Notification.permission !== 'denied'
      && this.getSubscribedOverviewId() !== overviewId
      && localStorage.getItem(this.declinedKeyPrefix + overviewId) !== 'true';
  }

  rememberDeclined(overviewId: string): void {
    localStorage.setItem(this.declinedKeyPrefix + overviewId, 'true');
  }

  subscribe(overviewId: string, preacherName: string): Promise<void> {
    if (!this.isSupported()) {
      return Promise.reject(new Error('Push notifications are not supported by this browser.'));
    }

    return Notification.requestPermission().then(permission => {
      if (permission !== 'granted') {
        throw new Error('Notification permission was not granted.');
      }

      return Promise.all([
        navigator.serviceWorker.register('push-sw.js'),
        fetch('push.php?action=config', {credentials: 'same-origin'})
      ]);
    }).then(([registration, response]) => {
      if (!response.ok) {
        throw new Error(`Push configuration could not be loaded (${response.status}).`);
      }

      return Promise.all([
        registration,
        response.json() as Promise<PushConfiguration>
      ]);
    }).then(([registration, configuration]) => {
      return registration.pushManager.getSubscription().then(existingSubscription => {
        if (existingSubscription) {
          return existingSubscription;
        }

        return registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.decodeBase64Url(configuration.publicKey)
        });
      });
    }).then(subscription => {
      return fetch('push.php?action=subscribe', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          overviewId,
          subscription: subscription.toJSON()
        })
      });
    }).then(response => {
      if (!response.ok) {
        throw new Error(`Subscription could not be saved (${response.status}).`);
      }

      const state: PushSubscriptionState = {overviewId, preacherName};
      localStorage.setItem(this.stateKey, JSON.stringify(state));
      localStorage.removeItem(this.declinedKeyPrefix + overviewId);
    });
  }

  unsubscribe(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      this.clearState();
      return Promise.resolve();
    }

    return navigator.serviceWorker.getRegistration('push-sw.js').then(registration => {
      if (!registration) {
        return null;
      }

      return registration.pushManager.getSubscription();
    }).then(subscription => {
      if (!subscription) {
        this.clearState();
        return Promise.resolve();
      }

      return fetch('push.php?action=unsubscribe', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({endpoint: subscription.endpoint})
      }).then(response => {
        if (!response.ok) {
          throw new Error(`Subscription could not be removed (${response.status}).`);
        }

        return subscription.unsubscribe();
      }).then(() => this.clearState());
    });
  }

  private clearState(): void {
    localStorage.removeItem(this.stateKey);
  }

  private getState(): PushSubscriptionState | null {
    const storedState = localStorage.getItem(this.stateKey);

    if (!storedState) {
      return null;
    }

    try {
      const state = JSON.parse(storedState) as Partial<PushSubscriptionState>;

      if (typeof state.overviewId === 'string' && typeof state.preacherName === 'string') {
        return state as PushSubscriptionState;
      }
    } catch {
      this.clearState();
    }

    return null;
  }

  private decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const binary = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));

    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  }
}
