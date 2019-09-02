import { TestBed } from '@angular/core/testing';
import { ConfigService } from './config.service';
import { RequiredConfigurationMissingError } from './errors';

interface MyModel {
    foo: number;
    bar?: string;
}

describe('Config Service {T}', () => {
    let configService: ConfigService<MyModel>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                ConfigService
            ],
        });

        configService = TestBed.get(ConfigService);
    });

    it('should create', () => {
        expect(configService).toBeTruthy();
    });

    it('should set its current config to the one provided', () => {
        const c: MyModel = {
            foo: 123
        };
        configService.configure(c);
        configService.current$.subscribe(config => expect(config).toEqual(c));
    });

    it('should set its current config to the one provided', () => {
        const defaultConfig: MyModel = {
            foo: 101,
            bar: 'foobar'
        };

        const c: MyModel = {
            foo: 123
        };
        configService.configure(c, { defaultConfig });
        configService.current$.subscribe(config => expect(config).toEqual({
            foo: 123,
            bar: 'foobar'
        }));
    });

    it('should throw if required field is missing', () => {
        expect(() => {
            configService.configure({ bar: 'www' } as any, { requiredFields: ['foo'] });
        })
            .toThrowError(RequiredConfigurationMissingError);
    });

});
