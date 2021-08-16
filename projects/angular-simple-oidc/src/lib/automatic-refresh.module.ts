import { NgModule } from '@angular/core';
import { ExpiringTokenRefresherDaemonService } from './daemons/expiring-token-refresher-daemon.service';

@NgModule({
  providers: [ExpiringTokenRefresherDaemonService],
})
export class AutomaticRefreshModule {
  constructor(protected readonly daemon: ExpiringTokenRefresherDaemonService) {
    this.daemon.startDaemon();
  }

  // TODO: consider using forRoot pattern here
}
