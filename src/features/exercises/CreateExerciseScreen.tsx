import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { type Edge } from 'react-native-safe-area-context';

import { Badge, Button, Card, Screen, ScreenHeader, Text, useTheme } from '@/design-system';
import { DEVICE_STATUS_LABEL, DEVICE_STATUS_TONE } from '@/features/devices/deviceStatus';
import { useDeviceStore } from '@/state/deviceStore';
import type { TargetPoint } from '@/types/domain';

import { TargetGrid } from './TargetGrid';
import { angleFromDevice, distanceFromDevice } from './targetGeometry';

type CreateExerciseScreenProps = {
  showBack?: boolean;
  edges?: Edge[];
};

export function CreateExerciseScreen({
  showBack = false,
  edges = ['top', 'bottom', 'left', 'right'],
}: CreateExerciseScreenProps) {
  const theme = useTheme();
  const connectionState = useDeviceStore((state) => state.connectionState);
  const sendDrill = useDeviceStore((state) => state.sendDrill);
  const [targets, setTargets] = useState<TargetPoint[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const selected = selectedIndex === null ? undefined : targets[selectedIndex];

  const addTarget = (point: TargetPoint) => {
    setTargets((current) => [...current, point]);
    setSelectedIndex(targets.length);
  };

  const removeTarget = (index: number) => {
    setTargets((current) => current.filter((_, i) => i !== index));
    setSelectedIndex(null);
  };

  const clear = () => {
    setTargets([]);
    setSelectedIndex(null);
  };

  const startDrill = async () => {
    if (connectionState === 'busy') {
      Alert.alert(
        'Drill already running',
        'Wait for the current drill to finish, or stop it first.',
      );
      return;
    }
    if (connectionState !== 'ready') {
      router.push({ pathname: '/devices/connect', params: { from: 'drill' } });
      return;
    }
    try {
      await sendDrill({ name: 'Custom drill', targets });
    } catch {
      Alert.alert('Couldn’t start the drill', 'Check the device connection and try again.');
    }
  };

  return (
    <Screen scroll padded={false} edges={edges}>
      <ScreenHeader
        title="Create Exercise"
        onBack={
          showBack ? () => (router.canGoBack() ? router.back() : router.replace('/')) : undefined
        }
        trailing={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Device ${DEVICE_STATUS_LABEL[connectionState]}. Open Connect GymBeam`}
            hitSlop={12}
            onPress={() => router.push({ pathname: '/devices/connect', params: { from: 'drill' } })}
          >
            <Badge
              label={DEVICE_STATUS_LABEL[connectionState]}
              tone={DEVICE_STATUS_TONE[connectionState]}
            />
          </Pressable>
        }
      />

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg }}>
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <TargetGrid
            targets={targets}
            selectedIndex={selectedIndex}
            onAddTarget={addTarget}
            onSelectTarget={setSelectedIndex}
            onRemoveTarget={removeTarget}
          />
        </Card>
        <Text
          variant="caption"
          color="secondary"
          style={{ textAlign: 'center', marginTop: theme.spacing.sm }}
        >
          Tap the grid to add a target · Long-press a target to remove it
        </Text>
      </View>

      <View style={{ flex: 1, padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', minHeight: 76 }}>
          {selected && selectedIndex !== null ? (
            <>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: theme.radius.full,
                  backgroundColor: theme.colors.accent,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: theme.spacing.lg,
                }}
              >
                <Text variant="bodyStrong" style={{ color: theme.colors.onAccent }}>
                  {selectedIndex + 1}
                </Text>
              </View>
              <Metric
                icon="angle-acute"
                label="Angle"
                value={`${angleFromDevice(selected).toFixed(2)}°`}
              />
              <View
                style={{
                  width: 1,
                  alignSelf: 'stretch',
                  backgroundColor: theme.colors.border,
                }}
              />
              <Metric
                icon="arrow-expand-horizontal"
                label="Distance"
                value={`${distanceFromDevice(selected).toFixed(2)} m`}
              />
            </>
          ) : (
            <Text color="secondary" style={{ flex: 1, textAlign: 'center' }}>
              {targets.length === 0
                ? 'Add targets to build your drill'
                : 'Tap a target to see its angle and distance'}
            </Text>
          )}
        </Card>

        <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: 'auto' }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Clear"
              variant="outline"
              size="lg"
              onPress={clear}
              disabled={targets.length === 0}
              fullWidth
            />
          </View>
          <View style={{ flex: 2 }}>
            <Button
              label="Start a Drill"
              variant="accent"
              size="lg"
              onPress={startDrill}
              disabled={targets.length === 0}
              fullWidth
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) {
  const theme = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center', gap: theme.spacing.xxs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
        <MaterialCommunityIcons name={icon} size={20} color={theme.colors.accent} />
        <Text variant="caption" style={{ color: theme.colors.accent }}>
          {label}
        </Text>
      </View>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}
