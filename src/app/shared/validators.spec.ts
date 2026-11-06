import { FormControl } from '@angular/forms';
import { emailAddress, phoneNumber, requiredText } from './validators';

const check = (v: unknown, fn: typeof requiredText) => fn(new FormControl(v));

describe('validators', () => {
  it('requiredText rejects empty and whitespace-only text', () => {
    expect(check('', requiredText)).toEqual({ required: true });
    expect(check('   ', requiredText)).toEqual({ required: true });
    expect(check('Printer broken', requiredText)).toBeNull();
  });

  it('emailAddress needs a dotted domain', () => {
    expect(check('sam@example.com', emailAddress)).toBeNull();
    expect(check('sam@localhost', emailAddress)).toEqual({ email: true });
    expect(check('not an email', emailAddress)).toEqual({ email: true });
    expect(check('', emailAddress)).toBeNull();
  });

  it('phoneNumber allows common formats and blanks', () => {
    expect(check('+61 (04) 1234-5678', phoneNumber)).toBeNull();
    expect(check('', phoneNumber)).toBeNull();
    expect(check('12-34', phoneNumber)).toEqual({ phone: true });
    expect(check('call me', phoneNumber)).toEqual({ phone: true });
  });
});
