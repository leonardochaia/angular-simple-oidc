import { Injectable } from '@angular/core';
import { AuthConfig, SessionManagementConfig } from 'angular-simple-oidc';
import { tap, shareReplay } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ExternalConfigService {

  public readonly config$ = this.httpClient.get<{
    auth: AuthConfig,
    session: SessionManagementConfig
  }>('assets/simple-oidc-config.json')
    .pipe(
      tap(() => console.info(`Fetched config`)),
      tap(config => console.log(
        JSON.stringify(config, null, 2)
      )),
      shareReplay()
    );

  constructor(private readonly httpClient: HttpClient) { }

}
