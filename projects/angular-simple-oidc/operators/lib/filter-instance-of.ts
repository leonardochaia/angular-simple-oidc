import { Type } from '@angular/core';
import { filter } from 'rxjs/operators';
import { MonoTypeOperatorFunction } from 'rxjs';

export function filterInstanceOf<T>(type: Type<T>): MonoTypeOperatorFunction<T> {
    return filter<T>((e): e is T => e instanceof type);
}
