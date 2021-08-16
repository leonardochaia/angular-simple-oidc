import { NgModule } from '@angular/core';
import { TokenExpirationDaemonService } from './daemons/token-expiration-daemon.service';
import { TokenFromStorageInitializerDaemonService } from './daemons/token-from-storage-initializer-daemon.service';

@NgModule({
  providers: [TokenExpirationDaemonService, TokenFromStorageInitializerDaemonService],
})
export class TokenEventsModule {
  constructor(
    private readonly tokenExpirationDaemonService: TokenExpirationDaemonService,
    private readonly tokenFromStorageInitializerDaemonService: TokenFromStorageInitializerDaemonService
  ) {
    this.tokenExpirationDaemonService.startDaemon();
    this.tokenFromStorageInitializerDaemonService.startDaemon();
  }
}
