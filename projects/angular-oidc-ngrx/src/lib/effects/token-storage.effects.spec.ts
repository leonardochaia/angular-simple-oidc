import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs';

import { TokenStorageEffects } from './token-storage.effects';

describe('TokenStorageEffects', () => {
  let actions$: Observable<any>;
  let effects: TokenStorageEffects;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TokenStorageEffects,
        provideMockActions(() => actions$)
      ]
    });

    effects = TestBed.get<TokenStorageEffects>(TokenStorageEffects);
  });

  it('should be created', () => {
    expect(effects).toBeTruthy();
  });
});
