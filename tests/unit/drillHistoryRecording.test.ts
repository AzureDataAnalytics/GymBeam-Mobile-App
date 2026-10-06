import AsyncStorage from '@react-native-async-storage/async-storage';

import { useDeviceStore } from '@/state/deviceStore';
import { useHistoryStore } from '@/state/historyStore';

const TARGETS = [
  { x: 1, y: 1 },
  { x: -1, y: 1.5 },
  { x: 0, y: 2 },
];

describe('recording a drill into history', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await AsyncStorage.clear();
    await useHistoryStore.getState().load('user-1');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('saves a drill run on the mock device once it completes', async () => {
    const connecting = useDeviceStore.getState().connect();
    await jest.advanceTimersByTimeAsync(1000);
    await connecting;

    await useDeviceStore.getState().sendDrill({ name: 'Custom drill', targets: TARGETS });
    expect(useHistoryStore.getState().sessions).toEqual([]);

    await jest.advanceTimersByTimeAsync(10_000);

    const [saved] = useHistoryStore.getState().sessions;
    expect(saved).toMatchObject({ name: 'Custom drill', targets: TARGETS, isMock: true });
    expect(saved?.runs).toHaveLength(1);
    expect(saved?.runs[0]?.targetTimesSeconds).toHaveLength(TARGETS.length);

    const stored = JSON.parse((await AsyncStorage.getItem('gymbeam.history.v1.user-1'))!);
    expect(stored).toHaveLength(1);
  });
});
