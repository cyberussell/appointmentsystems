import { describe, it, expect } from 'vitest'
import { hasFeature, getFeatureLimit, tierWithFeature, PLANS } from './entitlements'

describe('entitlements', () => {
  it('Free plan has no gated features', () => {
    expect(hasFeature({ plan_tier: 'free' }, 'messenger_booking_bot')).toBe(false)
    expect(hasFeature({ plan_tier: 'free' }, 'email_notifications')).toBe(false)
    expect(hasFeature({ plan_tier: 'free' }, 'basic_reporting')).toBe(false)
  })

  it('Basic plan has reporting and email, not the Messenger bot', () => {
    expect(hasFeature({ plan_tier: 'basic' }, 'email_notifications')).toBe(true)
    expect(hasFeature({ plan_tier: 'basic' }, 'basic_reporting')).toBe(true)
    expect(hasFeature({ plan_tier: 'basic' }, 'messenger_booking_bot')).toBe(false)
  })

  it('Pro plan has every declared feature', () => {
    for (const feature of PLANS.pro.features) {
      expect(hasFeature({ plan_tier: 'pro' }, feature)).toBe(true)
    }
  })

  it('falls back to Free entitlements for an unknown plan_tier', () => {
    // @ts-expect-error deliberately invalid input — guards against a bad/legacy DB row
    expect(hasFeature({ plan_tier: 'nonexistent' }, 'basic_reporting')).toBe(false)
  })

  it('reports the correct numeric limits per plan', () => {
    expect(getFeatureLimit({ plan_tier: 'free' }, 'providerLimit')).toBe(1)
    expect(getFeatureLimit({ plan_tier: 'free' }, 'monthlyAppointments')).toBe(100)
    expect(getFeatureLimit({ plan_tier: 'basic' }, 'providerLimit')).toBe(5)
    expect(getFeatureLimit({ plan_tier: 'pro' }, 'providerLimit')).toBeNull()
    expect(getFeatureLimit({ plan_tier: 'pro' }, 'monthlyAppointments')).toBeNull()
  })

  it('tierWithFeature finds the cheapest tier that includes a feature', () => {
    expect(tierWithFeature('basic_reporting').tier).toBe('basic')
    expect(tierWithFeature('messenger_booking_bot').tier).toBe('pro')
  })
})
