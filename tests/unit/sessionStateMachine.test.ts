import { nextSessionState } from '@/features/sessions/sessionStateMachine';

describe('nextSessionState', () => {
  it('transitions idle -> running on SESSION_STARTED', () => {
    expect(nextSessionState('idle', 'SESSION_STARTED')).toBe('running');
  });

  it('transitions running -> completed on SESSION_COMPLETED', () => {
    expect(nextSessionState('running', 'SESSION_COMPLETED')).toBe('completed');
  });

  it('transitions running -> paused on PAUSED, and back on RESUMED', () => {
    expect(nextSessionState('running', 'PAUSED')).toBe('paused');
    expect(nextSessionState('paused', 'RESUMED')).toBe('running');
  });

  it('transitions any state -> error on ERROR', () => {
    expect(nextSessionState('running', 'ERROR')).toBe('error');
  });

  it('ignores target-level events, leaving the session state unchanged', () => {
    expect(nextSessionState('running', 'TARGET_SHOWN')).toBe('running');
    expect(nextSessionState('running', 'TARGET_REACHED')).toBe('running');
  });

  it('does not un-disconnect except via an explicit DEVICE_CONNECTED event', () => {
    expect(nextSessionState('disconnected', 'TARGET_SHOWN')).toBe('disconnected');
    expect(nextSessionState('disconnected', 'DEVICE_CONNECTED')).toBe('ready');
  });
});
