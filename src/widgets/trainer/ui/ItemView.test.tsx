import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildItem } from '@/entities/exercise';
import { rektionen } from '@/entities/rektion';
import { ItemView } from './ItemView';

/**
 * Rendered against a chosen item, because a random twelve-item session is no way to reach a
 * particular kind — or a particular state of one. Real records, never invented German.
 */
const steady = () => 0.42;
const warten = rektionen.find((r) => r.lemma === 'warten' && r.prep === 'auf');
const item = warten ? buildItem(warten, 'article', rektionen, steady) : undefined;

function show(given: string | null) {
  if (!item) throw new Error('no article item for warten auf');
  render(<ItemView lang="en" item={item} given={given} onAnswer={vi.fn()} onNext={vi.fn()} />);
  return item;
}

describe('before an answer', () => {
  it('gives nothing away — no case is named on any option', () => {
    show(null);
    expect(screen.queryByText(/Akkusativ|Dativ|Genitiv/)).toBeNull();
  });

  it('offers every option as a real button, numbered for the keyboard', () => {
    const built = show(null);
    for (const option of built.options) {
      expect(screen.getByRole('button', { name: new RegExp(option.label) })).toBeDefined();
    }
    expect(screen.getByText('1')).toBeDefined();
  });
});

describe('after a wrong answer', () => {
  it('names the case of the answer and of what was chosen', () => {
    const built = show(built0().label);
    expect(screen.getAllByText(/Akkusativ|Dativ/).length).toBeGreaterThan(1);
    expect(screen.getByText(/correct/)).toBeDefined();
    expect(screen.getByText(/your answer/)).toBeDefined();
    expect(built.options.some((o) => o.competitive)).toBe(true);
  });

  it('explains why the wo / wohin rule does not reach a prepositional object', () => {
    show(built0().label);
    expect(screen.getByText(/wo → Dativ \/ wohin → Akkusativ/)).toBeDefined();
  });
});

describe('after a right answer', () => {
  it('says nothing about why — there is nothing to correct', () => {
    if (!item) throw new Error('no article item for warten auf');
    show(item.answer);
    expect(screen.queryByText(/You have to know it/)).toBeNull();
  });
});

/** The competitive option: the same preposition in a different case. */
function built0() {
  const rival = item?.options.find((o) => o.competitive);
  if (!rival) throw new Error('no competitive option');
  return rival;
}
