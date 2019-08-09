import { RequiredParemetersMissingError } from './errors';

export function validateObjectRequiredProps<T>(obj: T, props: (keyof T)[]) {
    for (const key of props) {
        if (!obj.hasOwnProperty(key)) {
            throw new RequiredParemetersMissingError(key.toString(), {
                object: obj,
                requiredProps: props
            });
        }
    }
}
