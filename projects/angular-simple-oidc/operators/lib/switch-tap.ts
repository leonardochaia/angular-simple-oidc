import { Observable, ObservableInput } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

export function switchTap<T, R>(fn: (v: T) => Observable<R>) {
    return switchMap<T, ObservableInput<T>>(v => fn(v).pipe(map(() => v)));
}
