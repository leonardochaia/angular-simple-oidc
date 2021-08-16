import { NgModule,  ModuleWithProviders } from '@angular/core';
import { SessionCheckService } from './session-check.service';
import { AuthorizeEndpointSilentClientService } from './authorize-endpoint-silent-client.service';
import {
  SESSION_MANAGEMENT_CONFIG,
  SESSION_MANAGEMENT_CONFIG_INITIALIZER,
  SESSION_MANAGEMENT_CONFIG_SERVICE_PROVIDER
} from './providers';
import { SessionManagementConfig } from './models';
import { SessionCheckDaemonService } from './session-check-daemon.service';
import { SilentFlowDaemonService } from './silent-flow-daemon.service';

/**
 * Implements Session Checks according to Session Management
 * https://openid.net/specs/openid-connect-session-1_0.html
 */
@NgModule({
  providers: [
    SessionCheckService,
    AuthorizeEndpointSilentClientService,
    SessionCheckDaemonService,
    SilentFlowDaemonService,
  ],
})
export class SessionManagementModule {
  constructor(
    protected readonly sessionCheckDaemonService: SessionCheckDaemonService,
    protected readonly silentFlowDaemonService: SilentFlowDaemonService,
  ) {
    this.sessionCheckDaemonService.startDaemon();
    this.silentFlowDaemonService.startDaemon();
  }

  /**
   * Should be called once on your Angular Root Application Module
   */
  public static forRoot(config?: SessionManagementConfig): ModuleWithProviders<SessionManagementModule> {
    // TODO: add sanity checks with forRoot + @Optional()

    return {
      ngModule: SessionManagementModule,
      providers: [
        config != null ? {
          provide: SESSION_MANAGEMENT_CONFIG,
          useValue: config
        } : [],
        SESSION_MANAGEMENT_CONFIG_SERVICE_PROVIDER,
        SESSION_MANAGEMENT_CONFIG_INITIALIZER,
      ]
    };
  }
}
