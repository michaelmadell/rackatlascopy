import { describe, it, expect } from 'vitest'
import { paginate } from './pagination'

describe('paginate', () => {
  it('slices docs and computes totals', () => {
    const all = Array.from({ length: 25 }, (_, i) => i)
    const result = paginate(all, 2, 10)
    expect(result.docs).toEqual(Array.from({ length: 10 }, (_, i) => i + 10))
    expect(result.totalDocs).toBe(25)
    expect(result.totalPages).toBe(3)
  })

  it('returns totalPages of at least 1 for an empty list', () => {
    expect(paginate([], 1, 10).totalPages).toBe(1)
  })
})
