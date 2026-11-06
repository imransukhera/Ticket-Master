import { humanize, initials, toneClass } from './format';

describe('format', () => {
  it('humanize', () => {
    expect(humanize('IN_PROGRESS')).toBe('In progress');
    expect(humanize('inProgress')).toBe('In progress');
    expect(humanize(null)).toBe('');
  });

  it('toneClass', () => {
    expect(toneClass('IN_PROGRESS')).toBe('tone-inprogress');
    expect(toneClass('Critical')).toBe('tone-critical');
  });

  it('initials', () => {
    expect(initials('Jane Citizen')).toBe('JC');
    expect(initials('  ')).toBe('?');
  });
});
