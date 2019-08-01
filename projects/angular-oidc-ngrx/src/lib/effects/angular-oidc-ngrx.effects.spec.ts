import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs';

import { AngularOidcNgrxEffects } from './angular-oidc-ngrx.effects';

describe('AngularOidcNgrxEffects', () => {
  let actions$: Observable<any>;
  let effects: AngularOidcNgrxEffects;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AngularOidcNgrxEffects,
        provideMockActions(() => actions$)
      ]
    });

    effects = TestBed.get<AngularOidcNgrxEffects>(AngularOidcNgrxEffects);
  });

  it('should be created', () => {
    expect(effects).toBeTruthy();
  });
});
