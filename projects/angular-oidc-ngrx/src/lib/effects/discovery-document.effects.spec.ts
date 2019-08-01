import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable } from 'rxjs';

import { DiscoveryDocumentEffects } from './discovery-document.effects';

describe('DiscoveryDocumentEffects', () => {
  let actions$: Observable<any>;
  let effects: DiscoveryDocumentEffects;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DiscoveryDocumentEffects,
        provideMockActions(() => actions$)
      ]
    });

    effects = TestBed.get<DiscoveryDocumentEffects>(DiscoveryDocumentEffects);
  });

  it('should be created', () => {
    expect(effects).toBeTruthy();
  });
});
