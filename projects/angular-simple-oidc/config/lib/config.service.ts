import { Injectable } from '@angular/core';
import { RequiredConfigurationMissingError } from './errors';
import { ReplaySubject } from 'rxjs';
import { EventsService, SimpleOidcInfoEvent } from 'angular-simple-oidc/events';

export interface ConfigServiceOptions<T> {
  defaultConfig?: Partial<T>;
  requiredFields?: (keyof T)[];
}

@Injectable()
export class ConfigService<T> {

  public get current$() {
    return this.configSubject.asObservable();
  }

  protected configSubject = new ReplaySubject<T>(1);

  constructor(protected readonly events: EventsService) { }

  public configure(config: T, options: ConfigServiceOptions<T> = {}) {

    const current = Object.assign({}, options.defaultConfig, config);

    if (options.requiredFields) {
      this.validateConfiguration(current, options.requiredFields);
    }
    this.configSubject.next(current);

    this.events.dispatch(new SimpleOidcInfoEvent('Configuration obtained', current));
  }

  protected validateConfiguration(config: T, requiredFields: (keyof T)[]) {
    // Fields that are not in the config aka == undefined
    const invalidFields = requiredFields
      .filter(field => !(field in config));

    if (invalidFields.length) {
      throw new RequiredConfigurationMissingError({
        config,
        requiredFields
      });
    }
  }
}
