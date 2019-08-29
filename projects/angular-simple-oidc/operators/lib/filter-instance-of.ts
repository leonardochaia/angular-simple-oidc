import { Type } from '@angular/core';
import { filter } from 'rxjs/operators';

export function filterInstanceOf<T>(type: Type<T>) {
    return filter<T>((e): e is T => e instanceof type);
}
