import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs';

import { AuthConfigEffects } from './auth-config.effects';

describe('AuthConfigEffects', () => {
  let actions$: Observable<any>;
  let effects: AuthConfigEffects;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthConfigEffects,
        provideMockActions(() => actions$)
      ]
    });

    effects = TestBed.get<AuthConfigEffects>(AuthConfigEffects);
  });

  it('should be created', () => {
    expect(effects).toBeTruthy();
  });
});
